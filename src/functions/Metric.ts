import { app, InvocationContext, Timer } from "@azure/functions";
import axios from "axios";
import moment = require("moment");

export async function Metric(myTimer: Timer, context: InvocationContext): Promise<void> {
    const apiEndpoint = "https://myriad-admin-server.azurewebsites.net/call-metrics/generate";

    const tenantIDs = ["0001", "0002", "0003", "0004", "0005", "0006", "0007"];

    const todayDate = moment().format('YYYY-MM-DD');
    const yesterdayDate = moment().subtract(1, 'day').format('YYYY-MM-DD');

    const datesToHit = [yesterdayDate, todayDate];  // 🆕 Now hit both dates

    // 🕰️ Print current IST time
    const currentISTTime = moment().utcOffset("+05:30").format('YYYY-MM-DD HH:mm:ss');
    context.log(`🕰️ Current IST Time: ${currentISTTime}`);

    try {
        const requests = [];

        for (const tenantID of tenantIDs) {
            for (const isLive of ["true", "false"]) {
                for (const date of datesToHit) {  // 🆕 Add loop for dates
                    const requestBody = {
                        tenantId: tenantID,
                        date,
                        scheduleTime: new Date().toISOString(),
                        triggeredBy: "system",
                        isLiveMode: isLive
                    };

                    requests.push(
                        axios.post(apiEndpoint, requestBody)
                            .then(res => ({
                                status: 'fulfilled',
                                tenantID,
                                isLive,
                                date,
                                response: res
                            }))
                            .catch(err => ({
                                status: 'rejected',
                                tenantID,
                                isLive,
                                date,
                                error: err
                            }))
                    );
                }
            }
        }

        const results = await Promise.all(requests);

        results.forEach(result => {
            if (result.status === "fulfilled") {
                context.log(`✅ Success | tenantId: ${result.tenantID} | isLive: ${result.isLive} | date: ${result.date}`);
                context.log(`📦 Response: ${JSON.stringify(result.response.data)}`);
            } else {
                context.log(`❌ Failure | tenantId: ${result.tenantID} | isLive: ${result.isLive} | date: ${result.date}`);
                context.log(`🧨 Error: ${result.error.message}`);
            }
        });

    } catch (error) {
        context.log(`💥 Unexpected error in main try: ${error.message}`);
    }
}

// ⏰ Schedule: every day at 1:00 AM IST (7:30 PM UTC)
app.timer('Metric', {
    schedule: '0 30 19 * * *',
    handler: Metric
});
