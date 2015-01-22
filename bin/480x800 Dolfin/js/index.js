/**
 * (c)2011 Oğuz Kırat
 */
var language=bondi.devicestatus.getPropertyValue({ aspect: 'OperatingSystem', property:'language'});

var success = function(position) {
	var latitude = position.coords.latitude;
	var lat1=latitude+""
	var lat2=parseFloat(lat1.split('.')[0]+'.'+lat1.split('.')[1].slice(0, 3));
	var longitude = position.coords.longitude;
	var long1=longitude+""
	var long2=parseFloat(long1.split('.')[0]+'.'+long1.split('.')[1].slice(0, 3));
	var heading = position.coords.heading;
	var accuracy = position.coords.accuracy;
	var altitudeAccuracy= position.coords.altitudeAccuracy;
	var altitude = position.coords.altitude;	
	var speed = position.coords.speed/3.6;	
	var info = '<h2>Latitude: '+latitude+'<br />Longitude: '+longitude+'<br /> Accuracy:'+accuracy+' meters<br />Altitude: '+altitude+' meters (+-'+altitudeAccuracy+' meters)<br />Heading: '+heading+'<br />Speed: '+speed+' km/h</h2>';
	if (page=="speed")
	{
		if (language=="tur"){
			inner='<div style="font-size:36px;">Hız:</div><div style="font-size:48px;">'+speed+' km/h</div>';
			}
		else {
			inner='<div style="font-size:36px;">Speed:</div><div style="font-size:48px;">'+speed+' km/h</div>';
		}


	
	}
	if (page=="altitude")
	{
		if (language=="tur"){
			inner='<div style="font-size:36px;">Yükseklik:</div><div style="font-size:48px;">'+altitude+' m</div><div style="font-size:24px;">&plusmn; '+altitudeAccuracy+' m</div>';
			}
		else {
			inner='<div style="font-size:36px;">Altitude:</div><div style="font-size:48px;">'+altitude+' m</div><div style="font-size:24px;">&plusmn; '+altitudeAccuracy+' m</div>';
		}

	}
	if (page=="position")
	{
		if (language=="tur"){
	inner='<div style="font-size:36px;">Enlem:</div><div style="font-size:24px;">'+latitude+'</div><div style="font-size:36px;">Boylam:</div><div style="font-size:24px;">'+longitude+'</div><div style="font-size:20px;"><strong>Hata payı:</strong></div><div style="font-size:18px;">'+accuracy+' m</div>';

			}
		else {
	inner='<div style="font-size:36px;">Latitude:</div><div style="font-size:24px;">'+latitude+'</div><div style="font-size:36px;">Longitude:</div><div style="font-size:24px;">'+longitude+'</div><div style="font-size:20px;"><strong>Accuracy:</strong></div><div style="font-size:18px;">'+accuracy+' m</div>';

		}
	}
	if (page=="heading")
	{
		if (language=="tur"){
	inner='<div style="font-size:36px;">Yönelme:</div><div style="font-size:48px;">'+heading+'&deg; </div>';

			}
		else {
	inner='<div style="font-size:36px;">Heading:</div><div style="font-size:48px;">'+heading+'&deg; </div>';

		}
	}

	document.getElementById("info").innerHTML=inner;
	var int=self.setTimeout("appInit()",5000);	
	  



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



function appInit() {


	bondi.geolocation.getCurrentPosition(success, failure, { timeout: 120000 });  

}
