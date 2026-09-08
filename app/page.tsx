"use client";
import { FormEvent, useEffect, useState } from "react";

const LIFF_ID = "2010741545-WOEIhIFQ";
const APPS_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbwiK82lzhH5CM53CVElVJKsTORSVPamI91JmZNJC39QICS_hPlG9irseKKo4o8Bbd3-eA/exec";
const OA_URL = "https://line.me/R/oaMessage/%40deliveree_driver/?";
type Screen = "connecting" | "form" | "submitting" | "result" | "error";
type LiffApi = { init(o:{liffId:string}):Promise<void>; isLoggedIn():boolean; login(o?:{redirectUri?:string}):void; getAccessToken():string|null; getProfile():Promise<{userId:string;displayName:string}> };
type Reply = { success?:boolean; message?:string; referenceId?:string; recordId?:string; name?:string; phoneLocal?:string };
declare global { interface Window { liff?: LiffApi } }

function waitForLiff():Promise<LiffApi>{
  return new Promise((resolve,reject)=>{const start=Date.now();const timer=setInterval(()=>{if(window.liff){clearInterval(timer);resolve(window.liff)}else if(Date.now()-start>12000){clearInterval(timer);reject(new Error("The LINE connection library could not be loaded."))}},50)});
}

export default function Home(){
  const [screen,setScreen]=useState<Screen>("connecting");
  const [message,setMessage]=useState("");
  const [profileName,setProfileName]=useState("");
  const [lineUserId,setLineUserId]=useState("");
  const [result,setResult]=useState({name:"",phone:"",reference:""});
  const [errors,setErrors]=useState<Record<string,string>>({});

  useEffect(()=>{let active=true;(async()=>{try{const liff=await waitForLiff();await liff.init({liffId:LIFF_ID});if(!liff.isLoggedIn()){liff.login({redirectUri:location.href.split("#")[0]});return}const profile=await liff.getProfile();if(!liff.getAccessToken())throw new Error("LINE did not provide an access token.");if(active){setProfileName(profile.displayName||"");setLineUserId(profile.userId||"");setScreen("form")}}catch(error){if(active){setMessage(error instanceof Error?error.message:"Unable to connect to LINE.");setScreen("error")}}})();return()=>{active=false}},[]);

  async function submit(event:FormEvent<HTMLFormElement>){
    event.preventDefault();const form=event.currentTarget;const data=new FormData(form);
    const title=String(data.get("title")||"").trim();const firstName=String(data.get("firstName")||"").trim();const lastName=String(data.get("lastName")||"").trim();const phoneLocal=String(data.get("phoneNumber")||"").replace(/\D/g,"");
    const next:Record<string,string>={};if(!["นาย","นาง","นางสาว"].includes(title))next.title="กรุณาเลือกคำนำหน้า / Please select a title.";if(!firstName)next.firstName="กรุณากรอกชื่อ / Please enter your first name.";if(!lastName)next.lastName="กรุณากรอกนามสกุล / Please enter your last name.";if(!/^0\d{9}$/.test(phoneLocal))next.phoneNumber="กรุณากรอกเบอร์โทรศัพท์ 10 หลัก โดยขึ้นต้นด้วย 0 / Please enter 10 digits beginning with 0.";
    setErrors(next);if(Object.keys(next).length){requestAnimationFrame(()=>form.querySelector<HTMLElement>("[aria-invalid='true']")?.focus());return}
    setScreen("submitting");
    try{const accessToken=window.liff?.getAccessToken();if(!accessToken||!lineUserId)throw new Error("Your LINE session has expired. Please reopen this page from LINE.");
      const response=await fetch(APPS_SCRIPT_URL,{method:"POST",headers:{"content-type":"text/plain;charset=utf-8"},body:JSON.stringify({action:"submit_form",title,firstName,lastName,phoneLocal,lineUserId,accessToken,submissionSource:"LIFF GitHub Pages"}),redirect:"follow"});
      const reply=await response.json() as Reply;if(!reply.success)throw new Error(reply.message||"Unable to submit information.");
      setResult({name:reply.name||[title,firstName,lastName].join(" "),phone:reply.phoneLocal||phoneLocal,reference:reply.referenceId||reply.recordId||""});setScreen("result");
    }catch(error){setMessage(error instanceof Error?error.message:"Unable to submit information.");setScreen("error")}
  }
  function clear(field:string){if(errors[field])setErrors(current=>({...current,[field]:""}))}
  const confirmation=`ข้อมูลของฉันถูกบันทึกแล้ว (My information has been submitted)\nชื่อ (Name): ${result.name}\nเบอร์โทรศัพท์ (Phone): ${result.phone}\nรหัสอ้างอิง (Ref): ${result.reference}`;
  return <main className="shell"><section className="card"><div className="brand">deliver<span>ee</span></div>
    {screen==="connecting"&&<Status icon="🚚" title="ยินดีต้อนรับสู่ Deliveree Driver Hub" english="Welcome to Deliveree Driver Hub" detail="กำลังเชื่อมต่อ LINE… / Connecting to LINE…"/>}
    {screen==="submitting"&&<Status icon="⏳" title="กำลังบันทึกข้อมูล" english="Submitting your information" detail="กรุณารอสักครู่ / Please wait a moment."/>}
    {screen==="error"&&<Status danger icon="!" title="ไม่สามารถดำเนินการได้" english="Unable to continue" detail={message} action="ลองอีกครั้ง (Try again)" onAction={()=>location.reload()}/>} 
    {screen==="result"&&<Status icon="✓" title="บันทึกข้อมูลเรียบร้อยแล้ว" english="Information submitted" detail={`ชื่อ (Name): ${result.name}\nเบอร์โทรศัพท์ (Phone): ${result.phone}\nรหัสอ้างอิง (Ref): ${result.reference}\n\nกรุณาเก็บรหัสอ้างอิงนี้ไว้สำหรับการติดต่อเจ้าหน้าที่`} action="กลับไปที่แชท LINE" onAction={()=>{location.href=OA_URL+encodeURIComponent(confirmation)}}/>}
    {screen==="form"&&<form onSubmit={submit} className="form" noValidate><header><h1>ข้อมูลเบื้องต้น</h1><p>Basic Information{profileName?` · ${profileName}`:""}</p><p className="requiredNote">* จำเป็นต้องกรอกทุกช่อง / All fields are required.</p></header>
      <label>คำนำหน้า <span className="required">*</span> <small>(Title)</small><select name="title" required defaultValue="" aria-invalid={!!errors.title} aria-describedby="title-error" onChange={()=>clear("title")}><option value="" disabled>เลือกคำนำหน้า</option><option>นาย</option><option>นาง</option><option>นางสาว</option></select>{errors.title&&<em id="title-error" className="fieldError">{errors.title}</em>}</label>
      <label>ชื่อ <span className="required">*</span> <small>(First Name)</small><input name="firstName" required maxLength={80} autoComplete="given-name" aria-invalid={!!errors.firstName} aria-describedby="firstName-error" onInput={()=>clear("firstName")}/>{errors.firstName&&<em id="firstName-error" className="fieldError">{errors.firstName}</em>}</label>
      <label>นามสกุล <span className="required">*</span> <small>(Last Name)</small><input name="lastName" required maxLength={80} autoComplete="family-name" aria-invalid={!!errors.lastName} aria-describedby="lastName-error" onInput={()=>clear("lastName")}/>{errors.lastName&&<em id="lastName-error" className="fieldError">{errors.lastName}</em>}</label>
      <label>เบอร์โทรศัพท์ที่ใช้ลงทะเบียนกับ Deliveree <span className="required">*</span> <small>(Registered Phone Number)</small><input name="phoneNumber" required inputMode="numeric" pattern="0[0-9]{9}" maxLength={10} placeholder="0XXXXXXXXX" autoComplete="tel" aria-invalid={!!errors.phoneNumber} aria-describedby="phoneNumber-help phoneNumber-error" onInput={()=>clear("phoneNumber")}/><em id="phoneNumber-help">กรุณากรอกตัวเลข 10 หลัก โดยขึ้นต้นด้วย 0<br/>Please enter 10 digits beginning with 0.</em>{errors.phoneNumber&&<em id="phoneNumber-error" className="fieldError">{errors.phoneNumber}</em>}</label>
      <button type="submit">ส่งข้อมูล (Submit Information)</button></form>}
  </section></main>
}

function Status({icon,title,english,detail,action,onAction,danger=false}:{icon:string;title:string;english:string;detail:string;action?:string;onAction?:()=>void;danger?:boolean}){return <div className={`status tone-${danger?"danger":"success"}`}><div className="statusIcon">{icon}</div><h1>{title}</h1><h2>{english}</h2><p>{detail}</p>{action&&<button onClick={onAction}>{action}</button>}</div>}
