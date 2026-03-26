/* =========================
        Scroll Animation
========================= */

const scrollElements = document.querySelectorAll(".scroll-fade");
const elementInView = (el, dividend = 1) => {
  const elementTop = el.getBoundingClientRect().top;
  return (
    elementTop <=
    (window.innerHeight || document.documentElement.clientHeight) / dividend
  );
};

const displayScrollElement = (element) => {
  element.classList.add("active");
};

const hideScrollElement = (element) => {
  element.classList.remove("active");
};

const handleScrollAnimation = () => {
  scrollElements.forEach((el) => {
    if (elementInView(el, 1.25)) {
      displayScrollElement(el);
    } else {
      hideScrollElement(el);
    }
  });
};

window.addEventListener("scroll", () => {
  handleScrollAnimation();
});

/* =========================
        Cat Selection
========================= */
let selectedCat =
  localStorage.getItem("selectedCat") || "assets/images/pixel-cat.png";

const bigCat = document.getElementById("bigCat");
bigCat.src = selectedCat;

const getFileName = (path) => path.split("/").pop();
document.querySelectorAll(".cat-thumb").forEach((thumb) => {
  const img = thumb.querySelector("img");

  if (getFileName(img.src) === getFileName(selectedCat)) {
    thumb.classList.add("selected");
  }
});

function selectCat(img) {
  selectedCat = img.src;

  bigCat.src = selectedCat;
  bigCat.style.transform = "scale(1.05)";
  setTimeout(() => (bigCat.style.transform = "scale(1)"), 150);

  document
    .querySelectorAll(".cat-thumb")
    .forEach((t) => t.classList.remove("selected"));

  img.closest(".cat-thumb").classList.add("selected");
}

function confirmCat() {
  localStorage.setItem("selectedCat", selectedCat);
  window.location.href = "play.html";
}

/* =========================
        Nav Bar Toggle
========================= */
const navbarToggle = document.querySelector(".navbar-toggle");
const navbarMenu = document.querySelector(".navbar-menu");

navbarToggle.addEventListener("click", () => {
  navbarToggle.classList.toggle("active");
  navbarMenu.classList.toggle("active");
});
