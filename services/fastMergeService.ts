import { generateContentWithRetry, getValidModelName } from './geminiService';
import { findCrossModalitySkills } from './templateCatalog';

export interface FastMergeResult {
  html: string;
  plainText: string;
  title: string;
}

export const fastMergeWithTemplate = async (
  rawDictation: string,
  selectedTemplate: { id?: string; name: string; category?: string; modality?: string; lines?: string[]; docxBase64?: string; skillPrompt?: string },
  model: string,
  customPrompt?: string,
  customImages?: Array<{ data: string; mimeType: string }> | null,
  skillEnabled: boolean = false,
  activeSkillPrompt?: string,
  consultantStyleEnabled: boolean = false
): Promise<FastMergeResult> => {
  const templateLines = selectedTemplate.lines && selectedTemplate.lines.length > 0
    ? selectedTemplate.lines.join('\n')
    : selectedTemplate.name;

  const docTitle = selectedTemplate.lines?.[0] || selectedTemplate.name;

  const secondarySkills = (skillEnabled === true)
    ? findCrossModalitySkills(rawDictation, selectedTemplate.id)
    : [];

  let crossSkillBlock = '';
  if (secondarySkills.length > 0) {
    crossSkillBlock = `\n\n### ⚡ CROSS-MODALITY & INCIDENTAL PATHOLOGY CONSULTANT DIRECTIVES:\n` +
      secondarySkills.map(s => `[CROSS-MODALITY SKILL: ${s.name}]:\n${s.skillPrompt}`).join('\n\n');
  }

  const prompt = `
You are an expert subspecialty diagnostic Radiologist and precision medical report compiler.

=== BASELINE REPORT TEMPLATE ===
Template Title: "${docTitle}"
Baseline Normal Template Content:
${templateLines}

=== RADIOLOGIST'S INPUT / DICTATION ===
${rawDictation.trim()}

${(skillEnabled && (activeSkillPrompt || selectedTemplate.skillPrompt)) ? `=== PRIMARY CONSULTANT SKILL DIRECTIVES ===\n${activeSkillPrompt || selectedTemplate.skillPrompt}\n` : ''}
${crossSkillBlock}
${customPrompt ? `=== DOCTOR PREFERENCES ===\n${customPrompt}\n` : ''}

=== COMPILATION RULES ===
1. **Goal**: Merge the radiologist's findings into the baseline template and output clean, semantically-structured HTML for a live Word document editor.
2. **Organ-by-Organ Integration**:
   - For every anatomical structure where an abnormal finding is dictated (e.g. lung, pleura, mediastinum, lymph nodes, spine, brain, abdomen), REPLACE the corresponding normal template sentence with the dictated finding.
   - NEVER leave the normal template sentence intact alongside the abnormal finding for that organ.
   - For unaffected anatomical structures, retain the baseline normal template sentence unchanged.
3. ${consultantStyleEnabled
  ? `**AI Consultant Phrasing ACTIVE**: Translate shorthand/colloquial notes to formal consultant radiology phrasing, apply standard RADS scores, and synthesize a crisp, structured IMPRESSION section.`
  : `**STRICT VERBATIM MERGE (Default)**: Insert the radiologist's dictated findings EXACTLY as stated without altering, rewriting, or embellishing the text. Preserve the baseline impression unless abnormal findings were provided.`}
4. **HTML Formatting Specifications**:
   - Return ONLY the clean inner HTML for the document (do NOT wrap in <html>, <head>, or <body> tags, and do NOT use markdown code fences).
   - Use <h1 style="text-align: center; text-decoration: underline; margin-bottom: 12px; font-size: 18px; font-weight: bold;"> for the Main Title.
   - Use <p> for paragraphs with normal margin spacing (margin-bottom: 8px;).
   - Use <strong> for abnormal findings or emphasized sections.
   - Use <em>Clinical Profile:</em> or <em>Technique:</em> for subtitle sections if present.
   - At the bottom, format the IMPRESSION in a dedicated section:
     <div style="margin-top: 20px; padding-top: 10px; border-top: 1px solid #cbd5e1;">
       <h3 style="font-weight: bold; margin-bottom: 6px; font-size: 15px;">IMPRESSION:</h3>
       <ul style="margin: 0; padding-left: 20px;">
         <li style="margin-bottom: 4px;"><strong>Finding bullet point...</strong></li>
       </ul>
     </div>

Return pure, clean HTML ready to render directly inside the editor.
`;

  const parts: any[] = [];
  if (customImages && customImages.length > 0) {
    for (const img of customImages) {
      parts.push({
        inlineData: {
          mimeType: img.mimeType,
          data: img.data,
        },
      });
    }
  }
  parts.push({ text: prompt });

  const response = await generateContentWithRetry({
    model: getValidModelName(model),
    contents: parts,
    config: {
      temperature: 0.1,
    },
  });

  let rawHtml = response.text || '';
  // Clean markdown fences if Gemini added them
  rawHtml = rawHtml.replace(/^```html\s*|```\s*$/g, '').trim();

  // Create plain text version
  const tempDiv = typeof document !== 'undefined' ? document.createElement('div') : null;
  let plainText = '';
  if (tempDiv) {
    tempDiv.innerHTML = rawHtml;
    plainText = tempDiv.innerText;
  } else {
    plainText = rawHtml.replace(/<[^>]+>/g, '\n').replace(/\n+/g, '\n');
  }

  return {
    html: rawHtml,
    plainText,
    title: docTitle,
  };
};
