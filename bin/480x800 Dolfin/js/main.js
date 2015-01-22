/**
 * (c)2011 Oğuz Kırat
 */
var language=bondi.devicestatus.getPropertyValue({ aspect: 'OperatingSystem', property:'language'});

zoom=12;
mapn=0;
var views=new Array(); 
views[0]="roadmap";      
views[1]="satellite";
views[2]="hybrid";
views[3]="terrain";
var oldrequest="";
var bg="";
if (language=="tur"){
	var maploading='<p><img src="images/loading.gif" width="54" height="55" alt="Loading" /></p><p>Harita yükleniyor...</p>';	 
}
else {
	var maploading='<p><img src="images/loading.gif" width="54" height="55" alt="Loading" /></p><p>Loading Map...</p>';	 
		}	
preloadImages=[]
function preloadImg(image){
counter = preloadImages.length;
preloadImages[counter] = new Image();
preloadImages[counter].onerror = function() {
		if (language=="tur"){
	 document.getElementById('load').innerHTML='<p>Internet bağlantısı kurulamadı.<br />Widget hala bağlanmatı deniyor...</p>';			}
		else {
	 document.getElementById('load').innerHTML='<p>Internet connection is not available.<br />Widget is still trying to connect...</p>';
		}	
setTimeout("retry()", 5000);
}
preloadImages[counter].src = image;
}

var success = function(position) {
	var lat = position.coords.latitude+"";
	var latitude=lat.split('.')[0]+'.'+lat.split('.')[1].slice(0, 3);
	var longi = position.coords.longitude+"";
	var longitude=longi.split('.')[0]+'.'+longi.split('.')[1].slice(0, 3);
	var request = 'http://maps.google.com/maps/api/staticmap?center='+latitude+','+longitude+'&zoom='+zoom+'&size=400x400&maptype='+views[mapn]+'&format=jpg&markers=color:blue|label:A|'+latitude+','+longitude+'&sensor=true';
	if (request!=oldrequest){
	document.getElementById('load').innerHTML=maploading;		
	document.getElementById('preloader').src=request;
	preloadImg(request);
	var bg='url('+request+')';
	document.getElementById('map').style.background=bg;
	document.getElementById('load').innerHTML='';
	oldrequest=request;
	}
	setTimeout("appInit()",5000);

};
function retry(){
	if (language=="tur"){
			document.getElementById('info').innerHTML='<img src="images/loading.gif" width="54" height="55" alt="Loading" /></p><p>Hala GPS bağlantısı bekleniyor...</p>';

	}
	else
	{
			document.getElementById('info').innerHTML='<img src="images/loading.gif" width="54" height="55" alt="Loading" /></p><p>Still waiting for GPS connection...</p>';

	}
	appInit();
}
var failure = function(error) {
	if (error.code==2)
	{
			if (language=="tur"){
	document.getElementById("info").innerHTML="<h1>GPS aktif değil.</h1><br />Lütfen konumlandırmayı telefonunuzun bağlantı ayarlarından etkinleştirin.<p>Widget GPS bağlantısı kurmayı hala deniyor.</p><h2 onclick=\"javascript:window.location='index.html';\">Denemeyi durdurmak için tıklayın.</h2>";

	}
	else
	{
	document.getElementById("info").innerHTML="<h1>GPS is not active.</h1><br />Please enable location services under connectivity settings.<p>Widget is still trying to connect.</p><h2 onclick=\"javascript:window.location='index.html';\">Click to stop trying</h2>";

	}

	}
	else if(error.code==0)
	{
	if (language=="tur"){
	document.getElementById("info").innerHTML="<h1>Bilinmeyen hata.</h1><p>Widget bağlantı kurmayı yine de deniyor...</p><h2 onclick=\"javascript:window.location='index.html';\">Denemeyi durdurmak için tıklayın</h2>";

	}
	else
	{
	document.getElementById("info").innerHTML="<h1>Unknown error.</h1><p>But widget is still trying to connect.</p><h2 onclick=\"javascript:window.location='index.html';\">Click to stop trying</h2>";

	}
	}
	else if(error.code==3)
	{
			if (language=="tur"){
	document.getElementById("info").innerHTML="<h1>Zaman Aşımı</h1><p>Konumunuz tespit edilemedi. GPS iç mekanlarda kullanılamaz.</p><br />Widget denemeyi sürdürüyor...<h2 onclick=\"javascript:window.location='index.html';\">Denemeyi durdurmak için tıklayın</h2>";
	}
	else
	{
	document.getElementById("info").innerHTML="<h1>Timeout</h1><p>Your location was not detected. GPS is not usable indoors.</p><br />Widget is still trying to connect...<h2 onclick=\"javascript:window.location='index.html';\">Click to stop trying</h2>";

	}
	}

	setTimeout("retry()", 5000);
};




function zoomin(){
	if (zoom<20) {
	 zoom=zoom+1;
	 document.getElementById('load').innerHTML=maploading;	 
	 appInit();
	}
	 
}
function zoomout(){
	if (zoom>3){
	 zoom=zoom-1;
	 document.getElementById('load').innerHTML=maploading;	 	 
	 appInit();
	}
	 
}
function changeMapType(){
	 mapn=(mapn+1) % 4;
	 document.getElementById('load').innerHTML=maploading;	 
	 appInit();
	 
}

function appInit() {
	bondi.geolocation.getCurrentPosition(success, failure, { timeout: 120000 });  
}
