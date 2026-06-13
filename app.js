const API_URL = "http://localhost:3000/api/search";

let skills = [];
let favorites =
    JSON.parse(localStorage.getItem("sakura_favorites") || "[]");

/* ---------- Elements ---------- */

const welcomeScreen = document.getElementById("welcome-screen");
const app = document.getElementById("app");

const username = document.getElementById("username");
const nameInput = document.getElementById("nameInput");

const enterBtn = document.getElementById("enterBtn");
const logoutBtn = document.getElementById("logoutBtn");

const skillInput = document.getElementById("skillInput");
const addSkillBtn = document.getElementById("addSkillBtn");
const skillsContainer = document.getElementById("skillsContainer");

const positionInput = document.getElementById("positionInput");
const locationInput = document.getElementById("locationInput");
const typeInput = document.getElementById("typeInput");

const searchBtn = document.getElementById("searchBtn");

const resultsContainer =
    document.getElementById("resultsContainer");

const historyContainer =
    document.getElementById("historyContainer");

const loading =
    document.getElementById("loading");

const jobsFound =
    document.getElementById("jobsFound");

const bestMatch =
    document.getElementById("bestMatch");

const skillsCount =
    document.getElementById("skillsCount");

const stats =
    document.getElementById("stats");

const clearHistoryBtn =
    document.getElementById("clearHistoryBtn");

/* ---------- Startup ---------- */

init();

function init() {
    createPetals();
    loadUser();
    bindEvents();
    renderHistory();
}

/* ---------- User ---------- */

function loadUser() {
    const savedName =
        localStorage.getItem("sakura_user");

    if (!savedName) return;

    username.textContent = savedName;

    welcomeScreen.classList.add("hidden");
    app.classList.remove("hidden");
}

function enterApp() {
    const name = nameInput.value.trim();

    if (!name) {
        alert("Enter your name");
        return;
    }

    localStorage.setItem(
        "sakura_user",
        name
    );

    username.textContent = name;

    welcomeScreen.classList.add("hidden");
    app.classList.remove("hidden");
}

function logout() {
    localStorage.removeItem("sakura_user");
    location.reload();
}

/* ---------- Events ---------- */

function bindEvents() {
    enterBtn.addEventListener(
        "click",
        enterApp
    );

    logoutBtn.addEventListener(
        "click",
        logout
    );

    addSkillBtn.addEventListener(
        "click",
        addSkill
    );

    skillInput.addEventListener(
        "keydown",
        e => {
            if (e.key === "Enter") {
                addSkill();
            }
        }
    );

    searchBtn.addEventListener(
        "click",
        searchJobs
    );

    clearHistoryBtn.addEventListener(
        "click",
        clearHistory
    );
}

/* ---------- Skills ---------- */

function addSkill() {
    const value =
        skillInput.value.trim();

    if (!value) return;

    if (
        skills.some(
            s =>
                s.toLowerCase() ===
                value.toLowerCase()
        )
    ) {
        skillInput.value = "";
        return;
    }

    skills.push(value);

    skillInput.value = "";

    renderSkills();
}

function removeSkill(skill) {
    skills =
        skills.filter(
            s => s !== skill
        );

    renderSkills();
}

function renderSkills() {
    skillsContainer.innerHTML = "";

    skills.forEach(skill => {
        const tag =
            document.createElement("div");

        tag.className = "skill-tag";

        tag.innerHTML = `
            ${skill}
            <button
                class="skill-remove"
                onclick="removeSkill('${skill}')">
                ×
            </button>
        `;

        skillsContainer.appendChild(tag);
    });

    skillsCount.textContent =
        skills.length;
}

window.removeSkill =
    removeSkill;

/* ---------- Search ---------- */

async function searchJobs() {

    if (skills.length === 0) {
        alert(
            "Add at least one skill."
        );
        return;
    }

    const payload = {
        skills,
        position:
            positionInput.value.trim(),
        location:
            locationInput.value.trim(),
        type:
            typeInput.value
    };

    saveSearch(payload);

    loading.classList.remove("hidden");

    stats.classList.add("hidden");

    resultsContainer.innerHTML = "";

    try {

        const response =
            await fetch(
                API_URL,
                {
                    method: "POST",
                    headers: {
                        "Content-Type":
                            "application/json"
                    },
                    body:
                        JSON.stringify(
                            payload
                        )
                }
            );

        const data =
            await response.json();

        renderResults(
            data.results || []
        );

    } catch (error) {

        console.error(error);

        resultsContainer.innerHTML = `
            <div class="glass rounded-3xl p-6">
                Failed to load jobs.
                Backend offline?
            </div>
        `;
    }

    loading.classList.add("hidden");
}

/* ---------- Results ---------- */

function renderResults(results) {

    resultsContainer.innerHTML = "";

    if (!results.length) {

        resultsContainer.innerHTML = `
            <div class="glass rounded-3xl p-6">
                No opportunities found.
            </div>
        `;

        return;
    }

    stats.classList.remove("hidden");

    jobsFound.textContent =
        results.length;

    bestMatch.textContent =
        `${results[0].matchScore}%`;

    results.forEach(
        (job, index) => {

            const template =
                document
                    .getElementById(
                        "jobCardTemplate"
                    )
                    .content
                    .cloneNode(true);

            const card =
                template.querySelector(
                    ".result-card"
                );

            if (index === 0) {
                card.classList.add(
                    "top-match"
                );
            }

            template.querySelector(
                ".job-title"
            ).textContent =
                job.title;

            template.querySelector(
                ".job-company"
            ).textContent =
                job.company;

            template.querySelector(
                ".job-score"
            ).textContent =
                `${job.matchScore}%`;

            template.querySelector(
                ".job-location"
            ).textContent =
                job.location ||
                "Remote";

            const matched =
                template.querySelector(
                    ".matched-skills"
                );

            (
                job.matchedSkills ||
                []
            ).forEach(skill => {

                const span =
                    document.createElement(
                        "span"
                    );

                span.className =
                    "skill-match";

                span.textContent =
                    `✓ ${skill}`;

                matched.appendChild(
                    span
                );
            });

            const missing =
                template.querySelector(
                    ".missing-skills"
                );

            (
                job.missingSkills ||
                []
            ).forEach(skill => {

                const span =
                    document.createElement(
                        "span"
                    );

                span.className =
                    "skill-missing";

                span.textContent =
                    `✕ ${skill}`;

                missing.appendChild(
                    span
                );
            });

            const applyBtn =
                template.querySelector(
                    ".apply-btn"
                );

            applyBtn.href =
                job.applyUrl ||
                job.url ||
                "#";

            const favoriteBtn =
                template.querySelector(
                    ".favorite-btn"
                );

            favoriteBtn.addEventListener(
                "click",
                () =>
                    toggleFavorite(
                        job
                    )
            );

            resultsContainer.appendChild(
                template
            );
        }
    );
}

/* ---------- Favorites ---------- */

function toggleFavorite(job) {

    const exists =
        favorites.some(
            x =>
                x.id === job.id
        );

    if (exists) {

        favorites =
            favorites.filter(
                x =>
                    x.id !== job.id
            );

    } else {

        favorites.push(job);
    }

    localStorage.setItem(
        "sakura_favorites",
        JSON.stringify(
            favorites
        )
    );
}

/* ---------- History ---------- */

function saveSearch(search) {

    const history =
        JSON.parse(
            localStorage.getItem(
                "sakura_history"
            ) || "[]"
        );

    history.unshift({
        ...search,
        date:
            new Date()
                .toLocaleString()
    });

    localStorage.setItem(
        "sakura_history",
        JSON.stringify(
            history.slice(0, 20)
        )
    );

    renderHistory();
}

function renderHistory() {

    const history =
        JSON.parse(
            localStorage.getItem(
                "sakura_history"
            ) || "[]"
        );

    historyContainer.innerHTML =
        "";

    history.forEach(item => {

        const div =
            document.createElement(
                "div"
            );

        div.className =
            "history-card";

        div.innerHTML = `
            <div class="font-bold">
                ${item.position}
            </div>

            <div class="text-sm">
                ${item.location}
            </div>

            <div class="text-xs mt-2">
                ${item.date}
            </div>

            <button
                class="mt-3 bg-pink-500 text-white px-3 py-2 rounded-xl w-full">
                Re-run
            </button>
        `;

        div.querySelector(
            "button"
        ).addEventListener(
            "click",
            () => {

                skills =
                    item.skills || [];

                renderSkills();

                positionInput.value =
                    item.position;

                locationInput.value =
                    item.location;

                typeInput.value =
                    item.type;

                searchJobs();
            }
        );

        historyContainer.appendChild(
            div
        );
    });
}

function clearHistory() {

    localStorage.removeItem(
        "sakura_history"
    );

    renderHistory();
}

/* ---------- Sakura Petals ---------- */

function createPetals() {

    const petals =
        document.getElementById(
            "petals"
        );

    for (
        let i = 0;
        i < 35;
        i++
    ) {

        const petal =
            document.createElement(
                "div"
            );

        petal.className =
            "petal";

        petal.innerHTML = "🌸";

        petal.style.left =
            Math.random() *
                100 +
            "vw";

        petal.style.fontSize =
            12 +
            Math.random() *
                18 +
            "px";

        petal.style.animationDuration =
            8 +
            Math.random() *
                12 +
            "s";

        petal.style.animationDelay =
            Math.random() *
                10 +
            "s";

        petals.appendChild(
            petal
        );
    }
}