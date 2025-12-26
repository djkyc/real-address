export const config = { runtime: "edge" };

/* ================= 城市坐标池 ================= */
const CITY_POOL = {
  US:[{lat:37.7749,lng:-122.4194},{lat:34.0522,lng:-118.2437}],
  UK:[{lat:51.5074,lng:-0.1278}],
  FR:[{lat:48.8566,lng:2.3522}],
  DE:[{lat:52.5200,lng:13.4050}],
  CN:[{lat:39.9042,lng:116.4074}],
  TW:[{lat:25.0330,lng:121.5654}],
  HK:[{lat:22.3193,lng:114.1694}],
  JP:[{lat:35.6895,lng:139.6917}],
  KR:[{lat:37.5665,lng:126.9780}],
  IN:[{lat:28.6139,lng:77.2090}],
  AU:[{lat:-33.8688,lng:151.2093}],
  BR:[{lat:-23.5505,lng:-46.6333}],
  CA:[{lat:43.65107,lng:-79.347015}],
  RU:[{lat:55.7558,lng:37.6173}],
  ZA:[{lat:-33.9249,lng:18.4241}],
  MX:[{lat:19.4326,lng:-99.1332}],
  IT:[{lat:41.9028,lng:12.4964}],
  ES:[{lat:40.4168,lng:-3.7038}],
  TR:[{lat:41.0082,lng:28.9784}],
  SA:[{lat:24.7136,lng:46.6753}],
  AR:[{lat:-34.6037,lng:-58.3816}],
  EG:[{lat:30.0444,lng:31.2357}],
  NG:[{lat:6.5244,lng:3.3792}],
  ID:[{lat:-6.2088,lng:106.8456}]
};

/* ================= 姓名库（拆分） ================= */
const NAMES = {
  US:[["John","Smith"],["Michael","Brown"]],
  UK:[["Oliver","Taylor"]],
  FR:[["Lucas","Martin"]],
  DE:[["Max","Müller"]],
  CN:[["伟","李"],["强","王"]],
  JP:[["太郎","佐藤"]],
  DEFAULT:[["Alex","Lee"]]
};

/* ================= 电话格式 ================= */
const PHONE = {
  US:"+1 (XXX) XXX-XXXX",
  UK:"+44 7XXX XXXXXX",
  FR:"+33 6 XX XX XX XX",
  DE:"+49 15X XXXXXXXX",
  CN:"+86 1XX-XXXX-XXXX",
  JP:"+81 90-XXXX-XXXX",
  KR:"+82 10-XXXX-XXXX",
  IN:"+91 9XXXXXXXXX",
  AU:"+61 4XX XXX XXX",
  DEFAULT:"+1 XXX-XXX-XXXX"
};

/* ================= 工具 ================= */
const rand = a => a[Math.floor(Math.random() * a.length)];
const num = (a,b)=>Math.floor(Math.random()*(b-a+1))+a;
const genPhone = f => f.replace(/X/g,()=>num(0,9));
const near = c => ({lat:c.lat+(Math.random()-0.5)*0.02,lng:c.lng+(Math.random()-0.5)*0.02});

/* ================= 地址抽取（兜底） ================= */
function extractAddress(country,a){
  const road=a.road||a.pedestrian||a.residential||"";
  const city=a.city||a.town||a.village||a.suburb||"";
  const state=a.state||a.region||a.province||"";
  let house=a.house_number||`${num(1,999)}`;
  return {road,city,state,house};
}

/* ================= 主逻辑 ================= */
export default async function handler(req){
  const url=new URL(req.url);
  let country=url.searchParams.get("country");

  // auto → 根据 IP
  if(!country||country==="auto"){
    try{
      const r=await fetch("https://ipapi.co/country/");
      country=(await r.text()).trim();
    }catch{
      country="US";
    }
  }

  const client_ip =
    req.headers.get("x-forwarded-for")?.split(",")[0] || "unknown";

  const cities=CITY_POOL[country]||CITY_POOL.US;

  for(let i=0;i<5;i++){
    const coord=near(rand(cities));
    const api=`https://nominatim.openstreetmap.org/reverse?format=json&lat=${coord.lat}&lon=${coord.lng}&zoom=18&addressdetails=1`;
    const r=await fetch(api,{headers:{"User-Agent":"Address-Generator"}});
    const d=await r.json();
    if(!d.address)continue;

    const addr=extractAddress(country,d.address);
    if(!addr.city&&!addr.road)continue;

    const [first_name,last_name]=rand(NAMES[country]||NAMES.DEFAULT);
    const age=num(18,65);
    const dob=`${new Date().getFullYear()-age}-${num(1,12).toString().padStart(2,"0")}-${num(1,28).toString().padStart(2,"0")}`;

    return new Response(JSON.stringify({
      client_ip,
      country,
      first_name,
      last_name,
      gender:Math.random()>0.5?"Male":"Female",
      age,
      dob,
      phone:genPhone(PHONE[country]||PHONE.DEFAULT),
      house_number:addr.house,
      road:addr.road,
      city:addr.city,
      state:addr.state,
      lat:coord.lat,
      lng:coord.lng
    }),{
      headers:{
        "content-type":"application/json",
        "access-control-allow-origin":"*"
      }
    });
  }

  return new Response(JSON.stringify({error:"address unavailable"}),{status:503});
}
