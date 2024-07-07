async function moveDivisor(e) {
    var divisor = document.getElementsByClassName("divisor");
    while (document.getElementsByClassName("comparison")[0].clientWidth === undefined)
      await new Promise(r => setTimeout(r, 1000));
    var comparisonWidth = document.getElementsByClassName("comparison")[0].clientWidth;
    for (let pic of divisor) {
        pic.style.width = (e.offsetX * 100 / comparisonWidth) + "%";
    }
}
