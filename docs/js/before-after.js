var divisor = document.getElementsByClassName("divisor");
var comparisonWidth = document.getElementsByClassName("comparison")[0].clientWidth;

function moveDivisor(e) {
    for (let pic of divisor) {
        pic.style.width = (e.offsetX * 100 / comparisonWidth) + "%";
    }
}
