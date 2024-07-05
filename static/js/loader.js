document.addEventListener("DOMContentLoaded", function() {
    // Обработчики для форм
    const forms = document.querySelectorAll(".organization-form");
    forms.forEach(form => {
        form.addEventListener("submit", function() {
            document.getElementById("loader-overlay").style.display = "flex";
        });
    });

    // Обработчик для кнопки "Вернуться к выбору"
    const returnButton = document.getElementById('return-button');
    if (returnButton) {
        returnButton.addEventListener("click", function() {
            document.getElementById("loader-overlay").style.display = "flex";
        });
    }

    // Обработчик для логотипа
    const logoLink = document.getElementById('logo-link');
    if (logoLink) {
        logoLink.addEventListener("click", function() {
            document.getElementById("loader-overlay").style.display = "flex";
        });
    }
});