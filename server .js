const express = require("express");
const cors = require("cors");

const fetchRemoteOK =
    require("./services/remoteok");

const fetchArbeitNow =
    require("./services/arbeitnow");

const {
    calculateMatch
} = require("./services/matcher");

	const {
    calculateMatch,
    getSkillGapAnalysis,
    suggestRoles
} = require("./services/matcher");

const app = express();

app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 3000;

function extractSkills(text = "") {
    const knownSkills = [
        "javascript",
        "typescript",
        "node.js",
        "react",
        "next.js",
        "python",
        "docker",
        "aws",
        "kubernetes",
        "mongodb",
        "postgresql",
        "sql",
        "ai",
        "llm",
        "langchain",
        "discord.js",
        "web scraping",
        "api"
    ];

    const lower = text.toLowerCase();

    return knownSkills.filter(skill =>
        lower.includes(skill)
    );
}

async function fetchRemoteOK() {
    try {
        const response = await fetch(
            "https://remoteok.com/api",
            {
                headers: {
                    Accept: "application/json"
                }
            }
        );

        const data = await response.json();

        return data.slice(1).map(job => ({
            id: `rok-${job.id}`,
            title:
                job.position ||
                job.role ||
                "Unknown Position",

            company:
                job.company ||
                "Unknown Company",

            location:
                job.location ||
                "Remote",

            applyUrl:
                job.apply_url ||
                job.url,

            source: "RemoteOK",

            skills:
                job.tags || []
        }));
    } catch (error) {
        console.error(
            "RemoteOK Error:",
            error.message
        );

        return [];
    }
}

async function fetchArbeitNow() {
    try {
        const response = await fetch(
            "https://www.arbeitnow.com/api/job-board-api"
        );

        const data = await response.json();

        return (data.data || []).map(job => {

            const combinedText = `
                ${job.title || ""}
                ${job.description || ""}
                ${(job.tags || []).join(" ")}
            `;

            return {
                id:
                    "an-" +
                    (job.slug || Math.random()),

                title:
                    job.title ||
                    "Unknown Position",

                company:
                    job.company_name ||
                    "Unknown Company",

                location:
                    job.location ||
                    "Remote",

                applyUrl:
                    job.url,

                source:
                    "ArbeitNow",

                skills:
                    job.tags?.length
                        ? job.tags
                        : extractSkills(
                              combinedText
                          )
            };
        });

    } catch (error) {

        console.error(
            "ArbeitNow Error:",
            error.message
        );

        return [];
    }
}

app.get("/", (_, res) => {

    res.json({
        app:
            "Sakura Job Finder API 🌸",
        status:
            "running"
    });

});

app.post(
    "/api/search",
    async (req, res) => {

        try {

            const {
                skills = [],
                position = "",
                location = "",
                type = "both"
            } = req.body;

            const [
                remoteJobs,
                arbeitJobs
            ] = await Promise.all([
                fetchRemoteOK(),
                fetchArbeitNow()
            ]);

            let jobs = [
                ...remoteJobs,
                ...arbeitJobs
            ];

            if (
                type.toLowerCase() === "jobs"
            ) {
                jobs = jobs.filter(
                    job =>
                        !job.source
                            .toLowerCase()
                            .includes("gig")
                );
            }

            const rankedJobs =
                jobs
                    .map(job => {

                        const match =
                            calculateMatch({
                                userSkills:
                                    skills,

                                jobSkills:
                                    job.skills,

                                position,

                                jobTitle:
                                    job.title,

                                location,

                                jobLocation:
                                    job.location
                            });

                        return {
                            ...job,

                            matchScore:
                                match.matchScore,

                            matchedSkills:
                                match.matchedSkills,

                            missingSkills:
                                match.missingSkills,

                            breakdown:
                                match.breakdown,

                            skillGap:
                                getSkillGapAnalysis(
                                    match.missingSkills
                                )
                        };
                    })
                    .sort(
                        (a, b) =>
                            b.matchScore -
                            a.matchScore
                    )
                    .slice(0, 50);

            res.json({
                success: true,

                count:
                    rankedJobs.length,

                similarRoles:
                    suggestRoles(
                        position
                    ),

                results:
                    rankedJobs
            });

        } catch (error) {

            console.error(
                "Search Error:",
                error
            );

            res.status(500).json({
                success: false,
                error:
                    "Failed to search jobs"
            });
        }
    }
);
app.listen(PORT, () => {
    console.log(
        `🌸 Sakura API running on http://localhost:${PORT}`
    );
});