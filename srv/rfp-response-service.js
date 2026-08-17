const cds = require('@sap/cds');
const path = require('path');
const fs = require('fs');
const { OrchestrationClient } = require('@sap-ai-sdk/orchestration');
const { Document, Packer, Paragraph, TextRun, HeadingLevel, Table, TableRow, TableCell, WidthType, BorderStyle } = require('docx');

const PROMPT_PATH = path.join(__dirname, 'prompts', 'response_rfp_prompt.md');
const RFP_PATH = path.join(__dirname, 'rfp', 'rfp.txt');
const PLACEHOLDER = '{{paste your RFP content here}}';

async function generateRfpResponse() {
    const promptTemplate = fs.readFileSync(PROMPT_PATH, 'utf-8');
    const rfpContent = fs.readFileSync(RFP_PATH, 'utf-8');

    const userMessage = promptTemplate.replace(PLACEHOLDER, rfpContent);

    const client = new OrchestrationClient(
        {
            promptTemplating: {
                model: {
                    name: 'gpt-5.4',
                    params: { max_tokens: 8000, temperature: 0.2 }
                },
                prompt: {
                    template: [
                        { role: 'user', content: '{{?prompt}}' }
                    ]
                }
            }
        },
        { resourceGroup: 'default' },
        { destinationName: 'AICore' }
    );

    const response = await client.chatCompletion({
        placeholderValues: { prompt: userMessage }
    });

    const content = response.getContent();
    if (!content) {
        throw new Error('No content returned from LLM');
    }

    const jsonStr = content.replace(/^```json\s*/, '').replace(/```\s*$/, '');
    const proposal = JSON.parse(jsonStr);

    const docBuffer = await buildWordDocument(proposal);
    return { proposal, docBuffer };
}

async function buildWordDocument(proposal) {
    const font = '72';

    const doc = new Document({
        styles: {
            default: {
                document: {
                    run: { font }
                }
            }
        },
        sections: [
            {
                children: [
                    heading(proposal.proposalTitle, HeadingLevel.TITLE),
                    text(`Prepared for: ${proposal.preparedFor}`),
                    text(`Prepared by: ${proposal.preparedBy}`),
                    text(`Date: ${proposal.date}`),
                    spacer(),

                    heading('Executive Summary', HeadingLevel.HEADING_1),
                    text(proposal.executiveSummary),
                    spacer(),

                    heading('Architecture Overview', HeadingLevel.HEADING_1),
                    text(proposal.architectureOverview),
                    spacer(),

                    heading('Technology Stack', HeadingLevel.HEADING_1),
                    ...proposal.technologyStack.map(t => bullet(t)),
                    spacer(),

                    heading('Requirements', HeadingLevel.HEADING_1),
                    ...proposal.requirements.flatMap(req => [
                        heading(`${req.id} - ${req.description}`, HeadingLevel.HEADING_2),
                        text(`Proposed Solution: ${req.proposedSolution}`),
                        text(`SAP Services: ${req.sapServices.join(', ')}`),
                        text(`Effort Estimate: ${req.effortEstimateDays} days`),
                        spacer()
                    ]),

                    heading('Timeline', HeadingLevel.HEADING_1),
                    text(`Total Duration: ${proposal.timeline.totalWeeks} weeks`),
                    ...proposal.timeline.phases.flatMap(phase => [
                        heading(phase.name, HeadingLevel.HEADING_2),
                        text(`Duration: ${phase.durationWeeks} weeks`),
                        ...phase.deliverables.map(d => bullet(d))
                    ]),
                    spacer(),

                    heading('Team Composition', HeadingLevel.HEADING_1),
                    ...proposal.teamComposition.flatMap(member => [
                        heading(`${member.role} (${member.count})`, HeadingLevel.HEADING_2),
                        text(member.responsibilities)
                    ]),
                    spacer(),

                    heading('Assumptions', HeadingLevel.HEADING_1),
                    ...proposal.assumptions.map(a => bullet(a)),
                    spacer(),

                    heading('Risks & Mitigations', HeadingLevel.HEADING_1),
                    ...proposal.risks.flatMap(risk => [
                        text(`Risk: ${risk.description}`, true),
                        text(`Mitigation: ${risk.mitigation}`),
                        spacer()
                    ])
                ]
            }
        ]
    });

    return Packer.toBuffer(doc);
}

function heading(text, level) {
    return new Paragraph({ text, heading: level, spacing: { after: 120 } });
}

function text(content, bold = false) {
    return new Paragraph({
        children: [new TextRun({ text: content, bold, font: '72' })],
        spacing: { after: 80 }
    });
}

function bullet(content) {
    return new Paragraph({
        children: [new TextRun({ text: content, font: '72' })],
        bullet: { level: 0 },
        spacing: { after: 60 }
    });
}

function spacer() {
    return new Paragraph({ text: '', spacing: { after: 200 } });
}

module.exports = { generateRfpResponse, buildWordDocument };
