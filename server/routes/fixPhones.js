const express = require('express');
const router = express.Router();
const { fixAllPhones } = require('../services/phoneFixService');

let fixJobRunning = false;
let fixJobLog = [];
let fixJobResult = null;

// POST /api/fix-phones — start the fix job
router.post('/', async (req, res) => {
    if (fixJobRunning) {
        return res.status(409).json({ error: 'Fix job already running.', log: fixJobLog });
    }

    // Reset state
    fixJobRunning = true;
    fixJobLog = ['🚀 Fix job started — loading leads from database...'];
    fixJobResult = null;

    // Respond immediately so browser doesn't wait
    res.json({ message: 'Fix job started successfully.' });

    // Run in background using setImmediate to not block the response
    setImmediate(async () => {
        try {
            const result = await fixAllPhones((msg) => {
                fixJobLog.push(msg);
            });
            fixJobResult = result;
            fixJobLog.push(`__DONE__`);
        } catch (err) {
            fixJobLog.push(`❌ ERROR: ${err.message}`);
            fixJobLog.push(`__DONE__`);
            fixJobResult = { error: true, message: err.message };
        } finally {
            fixJobRunning = false;
        }
    });
});

// GET /api/fix-phones/status — poll for live progress
router.get('/status', (req, res) => {
    const visibleLog = fixJobLog.filter(l => l !== '__DONE__');
    const isDone = fixJobLog.includes('__DONE__');

    res.json({
        running: fixJobRunning,
        done: isDone,
        log: visibleLog,
        result: fixJobResult
    });
});

// DELETE /api/fix-phones — cancel / reset (for when user wants to restart)
router.delete('/', (req, res) => {
    fixJobRunning = false;
    fixJobLog = [];
    fixJobResult = null;
    res.json({ message: 'Fix job state cleared. You can start a new job.' });
});

module.exports = router;
