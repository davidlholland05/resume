// ---------- Mobile side menu ----------
const sidemenu = document.getElementById("sidemenu");

function openmenu() {
    sidemenu.style.right = "0";
}

function closemenu() {
    sidemenu.style.right = "-150px";
}

// ---------- Scroll reveal animations ----------
const revealEls = document.querySelectorAll(".reveal");

if ("IntersectionObserver" in window) {
    const revealObserver = new IntersectionObserver((entries, observer) => {
        for (const entry of entries) {
            if (entry.isIntersecting) {
                entry.target.classList.add("revealed");
                observer.unobserve(entry.target);
            }
        }
    }, { threshold: 0.15, rootMargin: "0px 0px -40px 0px" });

    revealEls.forEach(el => revealObserver.observe(el));
} else {
    // Older browsers: show everything immediately
    revealEls.forEach(el => el.classList.add("revealed"));
}

// ---------- About-section tabs (index.html only) ----------
const tablinks = document.getElementsByClassName("tab-links");
const tabcontents = document.getElementsByClassName("tab-contents");

function opentab(event, tabname) {
    for (const tablink of tablinks) {
        tablink.classList.remove("active-link");
    }
    for (const tabcontent of tabcontents) {
        tabcontent.classList.remove("active-tab");
    }
    event.currentTarget.classList.add("active-link");
    document.getElementById(tabname).classList.add("active-tab");
}

// ---------- Contact form -> Google Sheet (index.html only) ----------
const scriptURL = 'https://script.google.com/macros/s/AKfycbwe_V2vP355yYG-gwaCsPn1T8prIywnMrZDJxYcQJ9qAvdub3ZBO1XSL7Prgr9HZgMzdQ/exec';
const form = document.forms['submit-to-google-sheet'];
const msg = document.getElementById("msg");

if (form) {
    form.addEventListener('submit', e => {
        e.preventDefault();
        fetch(scriptURL, { method: 'POST', body: new FormData(form) })
            .then(response => {
                if (!response.ok) {
                    throw new Error(`Request failed: ${response.status}`);
                }
                msg.innerHTML = "Message sent successfully";
                setTimeout(() => { msg.innerHTML = ""; }, 5000);
                form.reset();
            })
            .catch(error => {
                msg.innerHTML = "Something went wrong — please try again.";
                console.error('Error!', error.message);
            });
    });
}
