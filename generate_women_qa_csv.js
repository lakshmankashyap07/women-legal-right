// generate_women_qa_csv.js
// Usage: node generate_women_qa_csv.js
const fs = require('fs');
const path = require('path');

const out = path.join(process.cwd(), 'legal_faq_220.csv');

const base = [
  ["dowry","What is dowry law?","दहेज के बारे में क्या कानून है?","Dowry is illegal in many countries; if demanded, report to police and seek legal support or women's help centers.","कई देशों में दहेज अवैध है; अगर दहेज मांगा जाए तो पुलिस में शिकायत करें और महिला सहायता केंद्रों से मदद लें।"],
  ["domestic_violence","What protections exist against domestic violence?","घरेलू हिंसा के खिलाफ क्या सुरक्षा है?","Most places provide protection orders and shelters. Seek police help, medical care, and legal aid or shelters for safety.","अधिकांश स्थानों पर सुरक्षा आदेश और आश्रय उपलब्ध हैं। सुरक्षा के लिए पुलिस, चिकित्सीय सहायता और कानूनी सहायता लें।"],
  ["harassment","How do I report workplace harassment?","कार्यस्थल पर उत्पीड़न की रिपोर्ट कैसे करूँ?","Document incidents, report to HR or the employer's complaint mechanism, and contact labour authorities or helplines if needed.","घटनाओं का दस्तावेज बनाएं, HR या नियोक्ता के शिकायत तंत्र में रिपोर्ट करें, और जरूरत पड़ने पर श्रम प्राधिकरण से संपर्क करें।"],
  ["fir","How to file a police complaint (FIR)?","FIR (पुलिस शिकायत) कैसे दर्ज कराई जाती है?","Go to the police station or use online portals if available; give clear details and seek legal aid if refused.","पुलिस स्टेशन जाएं या उपलब्ध हो तो ऑनलाइन पोर्टल का उपयोग करें; साफ जानकारी दें और इनकार होने पर कानूनी सहायता लें।"],
  ["custody","What are child custody rights after separation?","अलगाव के बाद बाल हिरासत के क्या अधिकार हैं?","Courts decide based on the child's best interest; mothers can seek custody or shared custody. Consult a family lawyer.","अदालतें बच्चे के सर्वोत्तम हितों के आधार पर निर्णय लेती हैं; मां हिरासत या साझी हिरासत की मांग कर सकती हैं। पारिवारिक वकील से सलाह लें।"],
  ["marriage","Can forced marriage be challenged?","क्या जबरन विवाह को चुनौती दी जा सकती है?","Yes. Forced marriage is illegal in many places. Contact police, courts or human rights groups for annulment and protection.","हाँ। कई जगहों पर जबरन विवाह अवैध है। रद्द करने और सुरक्षा के लिए पुलिस, अदालत या मानवाधिकार समूहों से संपर्क करें।"],
  ["divorce","What grounds exist for divorce?","विवाहविच्छेद के क्या आधार होते हैं?","Common grounds include cruelty, adultery, abandonment, and mutual consent. Laws vary by country and community.","आम आधारों में क्रूरता, व्यभिचार, परित्याग और आपसी सहमति शामिल हैं। कानून देश और समुदाय के अनुसार भिन्न होते हैं।"],
  ["maternity","What maternity protections exist at work?","काम पर मातृत्व के क्या अधिकार हैं?","Maternity leave, job protection during pregnancy and breastfeeding breaks are common; check local labour law.","मातृत्व अवकाश, गर्भावस्था के दौरान नौकरी सुरक्षा और स्तनपान अवकाश आम हैं; स्थानीय श्रम कानून देखें।"],
  ["legal_aid","How to get free legal aid?","मुफ्त कानूनी सहायता कैसे प्राप्त करें?","Contact national legal aid services, NGOs, or university legal clinics for free or low-cost help.","राष्ट्रीय कानूनी सहायता सेवाओं, एनजीओ या विश्वविद्यालय कानूनी क्लिनिक से मुफ्त या कम लागत सहायता लें।"],
  ["cyber_harassment","How to report online harassment?","ऑनलाइन उत्पीड़न की रिपोर्ट कैसे करें?","Save messages/screenshots, report on platform, and inform police or cyber cell; many countries have cybercrime laws.","संदेश/स्क्रीनशॉट सुरक्षित रखें, प्लेटफ़ॉर्म पर रिपोर्ट करें और पुलिस या साइबर सेल को सूचित करें; कई देशों में साइबर कानून हैं।"]
];

const seeds_questions = [
  "How to get a protection order in an emergency?",
  "What steps after sexual assault?",
  "How to report trafficking?",
  "Can a woman refuse domestic relocation by spouse?",
  "What are laws about marital rape?",
  "How to change name legally after marriage?",
  "How to get custody while staying safe?",
  "Where to find women's shelters near me?",
  "How to report workplace discrimination?",
  "What to do if police refuse to file FIR?"
];

const seeds_answers = [
  "Apply to family courts or local magistrate for a protection order; NGOs can help prepare documents.",
  "Seek immediate medical care, preserve evidence, report to police, and contact support services and legal aid.",
  "Contact police, anti-trafficking hotlines, NGOs and shelters; governments offer rescue and rehabilitation.",
  "Laws vary; seek legal advice and court protection if forced to relocate against your will.",
  "Marital rape laws differ across countries; check local criminal laws and consult a lawyer.",
  "Name-change process requires affidavit and ID updates; follow your country-specific procedure and update documents.",
  "Talk to a family lawyer, document violence, and ask the court for temporary custody and protection orders.",
  "Search government helplines, local NGO directories or contact police for immediate shelter referrals.",
  "Collect proof, complain to HR, use internal complaints committee (if any) and contact labour authorities.",
  "Ask for written refusal, escalate to senior police officers, or reach out to legal aid organisations."
];

// Build entries: start with base then add seed-based variations until reach 220
const rows = [];
rows.push(["keyword","question_en","question_hi","answer_en","answer_hi"]);

base.forEach(b => rows.push(b));

let idx = 0;
while (rows.length - 1 < 220) {
  const q = seeds_questions[idx % seeds_questions.length];
  const a = seeds_answers[idx % seeds_answers.length] + " If unsure, seek local legal advice.";
  const hi_q = "कृपया स्थानीय नियम और सहायता देखें।";
  const hi_a = "स्थानीय कानूनी सहायता लें।";
  const key = `mix_${rows.length}`;
  rows.push([key, q, hi_q, a, hi_a]);
  idx++;
}

const csvContent = rows.map(r =>
  r.map(cell => {
    // escape quotes and wrap with double quotes
    const s = String(cell).replace(/"/g, '""');
    return `"${s}"`;
  }).join(',')
).join('\n');

fs.writeFileSync(out, csvContent, 'utf8');
console.log('CSV created at:', out, ' rows:', rows.length - 1);
