const $ = (selector) => document.querySelector(selector);

function derivePlan(role, job, candidate, stage, duration) {
  const candidateName = (candidate.match(/^([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)/m) || [,'this candidate'])[1];
  const lowerJob = job.toLowerCase();
  const lowerCandidate = candidate.toLowerCase();
  const hasData = /data|analyst|experiment|metric/.test(lowerCandidate + lowerJob);
  const hasLeadership = /lead|mentor|manag/.test(lowerJob);
  const specialization = lowerJob.includes('activation') || lowerCandidate.includes('activation') ? 'activation' : 'the product area';
  return [
    { time: '0–5 min', category: 'OPENING', signal: 'Set context & build rapport', question: `What drew you to this ${role} opportunity, and what would make this your next meaningful move?`, why: `A warm, consistent opening that reveals motivation without overselling the company.`, answer: 'Listen for a clear connection between their strengths, the role’s problem space, and the kind of impact they want next. Strong candidates are specific about both the opportunity and their own growth edge.' },
    { time: '5–16 min', category: 'EXPERIENCE', signal: `Explore ${specialization} depth`, question: `Tell me about the most important ${specialization} problem you owned. How did you define success, make trade-offs, and know the work was successful?`, why: lowerCandidate.includes('18%') ? `This follows Morgan’s stated activation result while leaving room to probe their exact contribution.` : `This connects directly to a key outcome expected in the role.`, answer: `Look for ownership from insight to outcome: a sharp problem definition, a rationale for prioritisation, collaboration across functions, and concrete evidence. ${hasData ? 'Ask how they separated correlation from causal impact.' : ''}` },
    { time: '16–27 min', category: 'JUDGMENT', signal: 'Test product thinking', question: `Imagine usage is growing but conversion has stalled. How would you diagnose the problem, decide what to explore first, and align the team on a plan?`, why: 'A role-relevant scenario that tests structured thinking rather than memorised frameworks.', answer: 'A strong answer breaks down the funnel, starts with evidence and customer context, makes assumptions explicit, proposes focused experiments, and describes how they would communicate uncertainty and trade-offs.' },
    { time: '27–37 min', category: hasLeadership ? 'LEADERSHIP' : 'COLLABORATION', signal: hasLeadership ? 'Understand how they scale others' : 'Assess cross-functional partnership', question: hasLeadership ? `You’ll be expected to raise the bar for other product managers. Tell me about a time you influenced someone’s growth or decision-making without formal authority.` : `Tell me about a hard decision you made with design or engineering when the team did not initially agree.`, why: hasLeadership && /not managed|no direct/.test(lowerCandidate) ? 'This sensitively explores leadership potential beyond direct people management.' : 'This reveals how they create progress when priorities and perspectives differ.', answer: hasLeadership ? 'Listen for coaching behaviours: curiosity, direct feedback, a clear standard, and evidence that the other person or team became more effective. Avoid equating leadership only with managing reports.' : 'Look for respectful conflict, clarity on constraints, an ability to change their mind with evidence, and a durable working relationship after the decision.' },
    { time: '37–' + (duration.startsWith('60') ? '52' : duration.startsWith('30') ? '28' : '42') + ' min', category: 'REFLECTION', signal: 'Probe self-awareness', question: `Looking back at a product decision that did not work as intended, what would you do differently today?`, why: 'Tests learning agility and accountability, while avoiding a generic “weakness” question.', answer: 'Strong answers show genuine ownership, distinguish outcome from process, and name a specific change in how they now make decisions. Follow up on what they would preserve, not just what they would change.' },
    { time: 'Final 3 min', category: 'CLOSE', signal: 'Give space for questions', question: `What would you like to understand about the team, the role, or how we work?`, why: 'Candidate questions often surface their priorities and level of preparation.', answer: 'Leave time to answer transparently. Capture any concern that needs a follow-up rather than trying to resolve it in the moment.' }
  ];
}

function renderPlan(plan) {
  const role = $('#roleTitle').value.trim() || 'role';
  const candidate = $('#candidate').value.trim();
  const duration = $('#duration').value;
  const name = (candidate.match(/^([A-Z][a-z]+)/m) || [,'the candidate'])[1];
  $('#plan').classList.remove('hidden');
  $('.plan-header h2').textContent = plan.title || `Your ${duration} conversation with ${name}`;
  $('.plan-summary').textContent = plan.summary;
  $('.insight p').replaceChildren(Object.assign(document.createElement('b'), { textContent: 'Candidate signal: ' }), document.createTextNode(` ${plan.candidateInsight}`));
  $('.focus div').replaceChildren(...plan.focusAreas.map((area) => { const tag = document.createElement('span'); tag.textContent = area; return tag; }));
  $('#agenda').replaceChildren(...plan.questions.map((item) => {
    const card = $('#questionTemplate').content.firstElementChild.cloneNode(true);
    $('.time', card).textContent = item.time;
    $('.category', card).textContent = item.category;
    $('.signal', card).textContent = item.signal;
    $('h3', card).textContent = item.question;
    $('.why', card).textContent = item.why;
    $('.answer', card).textContent = item.strongAnswer || item.answer;
    return card;
  }));
  $('#plan').scrollIntoView({behavior:'smooth', block:'start'});
}

async function generatePlan() {
  const button = $('#generate');
  const roleTitle = $('#roleTitle').value.trim();
  const jobDescription = $('#jobDescription').value.trim();
  if (!roleTitle || !jobDescription) return alert('Please add a role title and job description first.');
  button.disabled = true; button.innerHTML = 'Creating plan <span>…</span>';
  try {
    const response = await fetch('/api/interview-plan', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ roleTitle, jobDescription, candidate: $('#candidate').value.trim(), stage: $('#stage').value, duration: $('#duration').value }) });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || 'The interview plan could not be created.');
    renderPlan(result);
  } catch (error) {
    alert(error.message || 'Unable to create an interview plan.');
  } finally { button.disabled = false; button.innerHTML = 'Create interview plan <span>→</span>'; }
}

$('#generate').addEventListener('click', generatePlan);
$('#regenerate').addEventListener('click', generatePlan);
$('#copyPlan').addEventListener('click', async (event) => {
  const text = [...document.querySelectorAll('.question-card')].map(card => `${$('.time',card).textContent} — ${$('h3',card).textContent}\nStrong answer: ${$('.answer',card).textContent}`).join('\n\n');
  try { await navigator.clipboard.writeText(text); event.currentTarget.textContent = 'Copied'; event.currentTarget.classList.add('copied'); setTimeout(()=>{event.currentTarget.textContent='Copy plan';event.currentTarget.classList.remove('copied')}, 1600); } catch { /* Clipboard permissions vary by browser. */ }
});
