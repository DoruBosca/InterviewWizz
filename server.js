const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');

const root = __dirname;
const port = Number(process.env.PORT || 3000);
const maxInputLength = 30000;
const mimeTypes = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8' };

const planSchema = {
  type: 'object', additionalProperties: false,
  required: ['title', 'summary', 'candidateInsight', 'focusAreas', 'questions'],
  properties: {
    title: { type: 'string' }, summary: { type: 'string' }, candidateInsight: { type: 'string' },
    focusAreas: { type: 'array', minItems: 2, maxItems: 4, items: { type: 'string' } },
    questions: { type: 'array', minItems: 5, maxItems: 7, items: {
      type: 'object', additionalProperties: false,
      required: ['time', 'category', 'signal', 'question', 'why', 'strongAnswer'],
      properties: {
        time: { type: 'string' }, category: { type: 'string' }, signal: { type: 'string' },
        question: { type: 'string' }, why: { type: 'string' }, strongAnswer: { type: 'string' }
      }
    }}
  }
};

function sendJson(response, status, data) {
  response.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' });
  response.end(JSON.stringify(data));
}

function readJson(request) {
  return new Promise((resolve, reject) => {
    let body = '';
    request.on('data', (chunk) => { body += chunk; if (body.length > maxInputLength) request.destroy(); });
    request.on('end', () => { try { resolve(JSON.parse(body || '{}')); } catch { reject(new Error('Invalid request.')); } });
    request.on('error', reject);
  });
}

function safeString(value) { return typeof value === 'string' ? value.trim().slice(0, maxInputLength) : ''; }

async function createPlan(request, response) {
  if (!process.env.OPENAI_API_KEY) return sendJson(response, 503, { error: 'InterviewWizz needs an OPENAI_API_KEY before it can generate with Terra.' });
  try {
    const body = await readJson(request);
    const roleTitle = safeString(body.roleTitle);
    const jobDescription = safeString(body.jobDescription);
    const candidate = safeString(body.candidate);
    const stage = safeString(body.stage);
    const duration = safeString(body.duration);
    if (!roleTitle || !jobDescription || !stage || !duration) return sendJson(response, 400, { error: 'Role title, job description, stage, and duration are required.' });

    const instructions = `You are InterviewWizz, an expert hiring-manager copilot for a software company. Create a practical, structured, fair interview plan. Assess job-relevant evidence only; do not infer or evaluate protected characteristics (including age, gender, ethnicity, disability, nationality, religion, family status) or personality from writing style. Base questions on the job description and candidate material. Avoid illegal or discriminatory questions.\n\nUse the requested interview duration to create a realistic timed agenda. Include an opening and closing question. Questions must be specific, open-ended, and include a concise follow-up signal. “strongAnswer” describes job-relevant evidence to listen for, never a supposed correct answer. If candidate information is absent, say so neutrally and do not invent experience.`;
    const input = `Role title: ${roleTitle}\nInterview stage: ${stage}\nInterview duration: ${duration}\n\nJob description:\n${jobDescription}\n\nCandidate CV or profile (may be blank):\n${candidate || '[No candidate information provided]'}`;
    const apiResponse = await fetch('https://api.openai.com/v1/responses', {
      method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${process.env.OPENAI_API_KEY}` },
      body: JSON.stringify({ model: 'gpt-5.6-terra', reasoning: { effort: 'medium' }, store: false, instructions, input, text: { format: { type: 'json_schema', name: 'interview_plan', strict: true, schema: planSchema } } })
    });
    const data = await apiResponse.json();
    if (!apiResponse.ok) return sendJson(response, apiResponse.status, { error: data.error?.message || 'Terra could not generate a plan.' });
    if (!data.output_text) return sendJson(response, 502, { error: 'Terra returned no interview plan. Please try again.' });
    return sendJson(response, 200, JSON.parse(data.output_text));
  } catch (error) {
    return sendJson(response, 500, { error: error instanceof SyntaxError ? 'The model returned an unreadable plan. Please try again.' : error.message || 'Unable to create the interview plan.' });
  }
}

function serveFile(request, response) {
  const url = request.url === '/' ? '/index.html' : request.url.split('?')[0];
  const filename = path.resolve(root, `.${url}`);
  if (!filename.startsWith(`${root}${path.sep}`) || !mimeTypes[path.extname(filename)]) { response.writeHead(404); return response.end('Not found'); }
  fs.readFile(filename, (error, file) => {
    if (error) { response.writeHead(404); return response.end('Not found'); }
    response.writeHead(200, { 'Content-Type': mimeTypes[path.extname(filename)], 'Cache-Control': 'no-store' }); response.end(file);
  });
}

http.createServer((request, response) => {
  if (request.method === 'POST' && request.url === '/api/interview-plan') return createPlan(request, response);
  if (request.method === 'GET') return serveFile(request, response);
  response.writeHead(405); response.end('Method not allowed');
}).listen(port, '127.0.0.1', () => console.log(`InterviewWizz is ready at http://127.0.0.1:${port}`));
