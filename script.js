document.addEventListener("DOMContentLoaded", () => {
  const searchBtn = document.getElementById("searchBtn");
  const input = document.querySelector(".search-box input");

  searchBtn.addEventListener("click", () => {
    alert(`Searching for: ${input.value || "nothing"} 🍄`);
  });
});
