// Sign-in, posting reports and voting, against the seeded test database.
import request from 'supertest';
import { afterAll, describe, expect, it } from 'vitest';
import { createApp } from '../../src/app.js';
import { pool } from '../../src/db/pool.js';

const app = createApp();
afterAll(() => pool.end());

// Next to Simpang 1366 Grocery on Jalan Tutong: about 6 km from the seeded
// reports in Kiulap, so reports posted here don't change other tests' results
const NEAR_GROCERY = { lat: 4.8951, lng: 114.8701 };
const MISSING_ID = '00000000-0000-4000-8000-00000000ffff';

let accounts = 0;
/** Signs a new account in by email code and gives it a nickname. Returns its token. */
async function signIn({ nickname = true } = {}) {
  accounts += 1;
  const email = `driver${accounts}-${Date.now()}@example.com`;
  const start = await request(app).post('/v1/auth/email/start').send({ email }).expect(202);
  const verify = await request(app)
    .post('/v1/auth/email/verify')
    .send({ email, code: start.body.dev_code })
    .expect(200);
  const token = verify.body.token;
  if (nickname) {
    await request(app)
      .patch('/v1/me')
      .set('Authorization', `Bearer ${token}`)
      .send({ nickname: `driver_${accounts}_${Date.now() % 100000}` })
      .expect(200);
  }
  return { token, email, auth: { Authorization: `Bearer ${token}` } };
}

const postReport = (auth, body) => request(app).post('/v1/reports').set(auth).send(body);

describe('email sign-in', () => {
  it('sends a 6-digit code (returned outside production)', async () => {
    const res = await request(app).post('/v1/auth/email/start').send({ email: 'Code@Example.com' }).expect(202);
    expect(res.body).toMatchObject({ sent: true, expires_in: 600 });
    expect(res.body.dev_code).toMatch(/^\d{6}$/);
  });

  it('rejects an invalid email address', async () => {
    const res = await request(app).post('/v1/auth/email/start').send({ email: 'not-an-email' }).expect(400);
    expect(res.body.error.code).toBe('invalid_request');
  });

  it('asks the driver to wait before sending another code', async () => {
    const email = 'resend@example.com';
    await request(app).post('/v1/auth/email/start').send({ email }).expect(202);
    const res = await request(app).post('/v1/auth/email/start').send({ email }).expect(429);
    expect(res.body.error.code).toBe('too_many_requests');
  });

  it('creates the account on first sign-in and asks for a nickname', async () => {
    const email = 'new-driver@example.com';
    const start = await request(app).post('/v1/auth/email/start').send({ email }).expect(202);
    const res = await request(app)
      .post('/v1/auth/email/verify')
      .send({ email, code: start.body.dev_code })
      .expect(200);
    expect(res.body).toMatchObject({ new_account: true, needs_nickname: true, user: { email, nickname: null } });
    expect(res.body.token).toEqual(expect.any(String));
  });

  it('rejects a wrong code and does not let a code be used twice', async () => {
    const email = 'twice@example.com';
    const start = await request(app).post('/v1/auth/email/start').send({ email }).expect(202);
    const wrong = start.body.dev_code === '000000' ? '111111' : '000000';
    const bad = await request(app).post('/v1/auth/email/verify').send({ email, code: wrong }).expect(400);
    expect(bad.body.error.code).toBe('invalid_code');

    await request(app).post('/v1/auth/email/verify').send({ email, code: start.body.dev_code }).expect(200);
    await request(app).post('/v1/auth/email/verify').send({ email, code: start.body.dev_code }).expect(400);
  });

  it('locks a code after 5 wrong attempts', async () => {
    const email = 'guesser@example.com';
    const start = await request(app).post('/v1/auth/email/start').send({ email }).expect(202);
    const wrong = start.body.dev_code === '000000' ? '111111' : '000000';
    for (let i = 0; i < 5; i += 1) {
      await request(app).post('/v1/auth/email/verify').send({ email, code: wrong }).expect(400);
    }
    await request(app).post('/v1/auth/email/verify').send({ email, code: start.body.dev_code }).expect(400);
  });
});

describe('/v1/me', () => {
  it('needs a valid token', async () => {
    await request(app).get('/v1/me').expect(401);
    await request(app).get('/v1/me').set('Authorization', 'Bearer not-a-token').expect(401);
  });

  it('returns the signed-in account', async () => {
    const { auth, email } = await signIn({ nickname: false });
    const res = await request(app).get('/v1/me').set(auth).expect(200);
    expect(res.body.user).toMatchObject({ email, nickname: null, role: 'user' });
  });

  it('sets a nickname, lower-cased, and refuses taken or invalid ones', async () => {
    const { auth } = await signIn({ nickname: false });
    const res = await request(app).patch('/v1/me').set(auth).send({ nickname: 'Pemandu_Baru' }).expect(200);
    expect(res.body.user.nickname).toBe('pemandu_baru');

    const taken = await request(app).patch('/v1/me').set(auth).send({ nickname: 'awang_hadi' }).expect(409);
    expect(taken.body.error.code).toBe('nickname_taken');
    await request(app).patch('/v1/me').set(auth).send({ nickname: 'no spaces!' }).expect(400);
  });

  it('stops working after signing out', async () => {
    const { auth } = await signIn();
    await request(app).post('/v1/auth/sign-out').set(auth).expect(204);
    await request(app).get('/v1/me').set(auth).expect(401);
  });
});

describe('POST /v1/reports', () => {
  it('needs an account', async () => {
    const res = await postReport({}, { label: 'jammed', ...NEAR_GROCERY }).expect(401);
    expect(res.body.error.code).toBe('unauthorized');
  });

  it('posts a report with its expiry and the nearest road', async () => {
    const { auth } = await signIn();
    const res = await postReport(auth, { label: 'jammed', ...NEAR_GROCERY, description: '  Slow at the lights  ' }).expect(
      201,
    );
    const { report } = res.body;
    expect(report).toMatchObject({
      label: 'jammed',
      description: 'Slow at the lights',
      road_name: 'Jalan Tutong',
      routing_effect: 'soft_avoid',
      mine: true,
      votes: { still_there: 0, gone: 0 },
    });
    const minutes = (new Date(report.expires_at) - new Date(report.created_at)) / 60_000;
    expect(minutes).toBeCloseTo(60, 0);
  });

  it('keeps Flooded until voted cleared, with no routing effect until confirmed', async () => {
    const { auth } = await signIn();
    const res = await postReport(auth, { label: 'flooded', ...NEAR_GROCERY }).expect(201);
    expect(res.body.report).toMatchObject({ expires_at: null, confirmed: false, routing_effect: 'none' });
  });

  it('only accepts reports in Brunei', async () => {
    const { auth } = await signIn();
    await postReport(auth, { label: 'careful', lat: 1.35, lng: 103.82 }).expect(400);
  });

  it('rejects unknown labels and long descriptions', async () => {
    const { auth } = await signIn();
    await postReport(auth, { label: 'pothole', ...NEAR_GROCERY }).expect(400);
    await postReport(auth, { label: 'careful', ...NEAR_GROCERY, description: 'x'.repeat(141) }).expect(400);
  });

  it('limits how many reports one account can send per hour', async () => {
    const { auth } = await signIn();
    for (let i = 0; i < 10; i += 1) {
      await postReport(auth, { label: 'careful', ...NEAR_GROCERY }).expect(201);
    }
    const res = await postReport(auth, { label: 'careful', ...NEAR_GROCERY }).expect(429);
    expect(res.body.error.code).toBe('too_many_reports');
  });
});

describe('GET /v1/reports/:id', () => {
  it('works without an account', async () => {
    const { auth } = await signIn();
    const posted = await postReport(auth, { label: 'danger', ...NEAR_GROCERY }).expect(201);
    const res = await request(app)
      .get(`/v1/reports/${posted.body.report.id}`)
      .query({ lat: NEAR_GROCERY.lat, lng: NEAR_GROCERY.lng })
      .expect(200);
    expect(res.body.report).toMatchObject({ id: posted.body.report.id, label: 'danger', distance_m: 0 });
    expect(res.body.report).not.toHaveProperty('mine');
  });

  it('answers 404 for a report that does not exist', async () => {
    await request(app).get(`/v1/reports/${MISSING_ID}`).expect(404);
  });
});

describe('POST /v1/reports/:id/votes', () => {
  async function newReport(label = 'closed') {
    const reporter = await signIn();
    const res = await postReport(reporter.auth, { label, ...NEAR_GROCERY }).expect(201);
    return { reporter, id: res.body.report.id };
  }
  const vote = (auth, id, value) => request(app).post(`/v1/reports/${id}/votes`).set(auth).send({ vote: value });

  it('needs an account', async () => {
    const { id } = await newReport();
    await vote({}, id, 'still_there').expect(401);
  });

  it('does not let reporters vote on their own report', async () => {
    const { reporter, id } = await newReport();
    const res = await vote(reporter.auth, id, 'still_there').expect(403);
    expect(res.body.error.code).toBe('own_report');
  });

  it('confirms Closed after two independent "still there" votes', async () => {
    const { id } = await newReport('closed');
    const first = await vote((await signIn()).auth, id, 'still_there').expect(200);
    expect(first.body.report).toMatchObject({ confirmed: false, my_vote: 'still_there' });
    const second = await vote((await signIn()).auth, id, 'still_there').expect(200);
    expect(second.body.report).toMatchObject({ confirmed: true, routing_effect: 'hard_avoid' });
  });

  it('counts one vote per driver, letting them change it', async () => {
    const { id } = await newReport('jammed');
    const voter = await signIn();
    await vote(voter.auth, id, 'still_there').expect(200);
    const changed = await vote(voter.auth, id, 'gone').expect(200);
    expect(changed.body.report.votes).toEqual({ still_there: 0, gone: 1 });
  });

  it('clears a report once two drivers say it is gone', async () => {
    const { id } = await newReport('flooded');
    await vote((await signIn()).auth, id, 'gone').expect(200);
    const res = await vote((await signIn()).auth, id, 'gone').expect(200);
    expect(res.body).toEqual({ cleared: true, report: null });
    await request(app).get(`/v1/reports/${id}`).expect(404);
  });

  it('answers 404 for a report that does not exist', async () => {
    await vote((await signIn()).auth, MISSING_ID, 'gone').expect(404);
  });
});
