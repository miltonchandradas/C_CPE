const cds = require('@sap/cds');
const crypto = require('crypto');
const { generateRfpResponse } = require('./rfp-response-service');
const fs = require('fs');
const path = require('path');

const RANDOM_NAMES = [
    'alpha', 'bravo', 'charlie', 'delta', 'echo', 'foxtrot',
    'golf', 'hotel', 'india', 'juliet', 'kilo', 'lima',
    'mike', 'nova', 'oscar', 'papa', 'quebec', 'romeo',
    'sierra', 'tango', 'uniform', 'victor', 'whiskey', 'zulu'
];

function generateRunName() {
    const randomName = RANDOM_NAMES[Math.floor(Math.random() * RANDOM_NAMES.length)];
    const now = new Date();
    const mm = String(now.getMonth() + 1).padStart(2, '0');
    const dd = String(now.getDate()).padStart(2, '0');
    const yyyy = now.getFullYear();
    const hh = String(now.getHours()).padStart(2, '0');
    const min = String(now.getMinutes()).padStart(2, '0');
    return `${randomName}_${mm}-${dd}-${yyyy}:${hh}:${min}`;
}

module.exports = class RfpService extends cds.ApplicationService {
    init() {
        this.on('generateProposal', async () => {
            const { TaskRuns } = cds.entities('taskruns');

            const runId = cds.utils.uuid();
            const runName = generateRunName();
            const now = new Date().toISOString();

            await INSERT.into(TaskRuns).entries({
                ID: runId,
                name: runName,
                startedAt: now,
                status: 'Pending',
                triggerSource: 'RfpService.generateProposal'
            });

            const { proposal, docBuffer } = await generateRfpResponse();

            const outDir = path.join(__dirname, '..', 'output');
            if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

            const now = new Date();
            const mmdd = String(now.getMonth() + 1).padStart(2, '0') + String(now.getDate()).padStart(2, '0');
            const yyyy = now.getFullYear();
            const hhmm = String(now.getHours()).padStart(2, '0') + String(now.getMinutes()).padStart(2, '0');
            const docPath = path.join(outDir, `proposal_${mmdd}${yyyy}${hhmm}.docx`);
            fs.writeFileSync(docPath, docBuffer);

            await UPDATE(TaskRuns).where({ ID: runId }).set({
                status: 'Completed',
                finishedAt: new Date().toISOString(),
                message: `Document saved to ${docPath}`
            });

            return JSON.stringify({
                message: 'Proposal generated successfully',
                documentPath: docPath,
                taskRunId: runId,
                taskRunName: runName,
                proposal
            });
        });

        return super.init();
    }
};
