function ready() {
	var data = getBody();
	var stats = document.getElementById( "stats" );
	stats.innerHTML = "<tr><td>" + data.body + "</td></tr>";
}
