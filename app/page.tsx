"use client";
import { FormEvent, useEffect, useState } from "react";

const LIFF_ID = "2010741545-WOEIhIFQ";
const APPS_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbwiK82lzhH5CM53CVElVJKsTORSVPamI91JmZNJC39QICS_hPlG9irseKKo4o8Bbd3-eA/exec";
const OA_URL = "https://line.me/R/oaMessage/%40deliveree_driver/?";
type Screen = "connecting" | "form" | "submitting" | "result" | "error";
type LiffApi = { init(o:{liffId:string}):Promise<void>; isLoggedIn():boolean; isInClient():boolean; login(o?:{redirectUri?:string}):void; closeWindow():void; getAccessToken():string|null; getProfile():Promise<{userId:string;displayName:string}>; sendMessages(messages:Array<{type:"text";text:string}>):Promise<void> };
type Reply = { success?:boolean; message?:string; referenceId?:string; recordId?:string; name?:string; phoneLocal?:string };
declare global { interface Window { liff?: LiffApi } }

function waitForLiff():Promise<LiffApi>{
  return new Promise((resolve,reject)=>{const start=Date.now();const timer=setInterval(()=>{if(window.liff){clearInterval(timer);resolve(window.liff)}else if(Date.now()-start>12000){clearInterval(timer);reject(new Error("The LINE connection library could not be loaded."))}},50)});
}

export default function Home(){
  const [screen,setScreen]=useState<Screen>("connecting");
  const [lineUserId,setLineUserId]=useState("");
  const [result,setResult]=useState({phone:"",reference:"",confirmationSent:false});
  const [errors,setErrors]=useState<Record<string,string>>({});

  useEffect(()=>{let active=true;(async()=>{try{const liff=await waitForLiff();await liff.init({liffId:LIFF_ID});if(!liff.isLoggedIn()){liff.login({redirectUri:location.href.split("#")[0]});return}const profile=await liff.getProfile();if(!liff.getAccessToken())throw new Error("LINE did not provide an access token.");if(active){setLineUserId(profile.userId||"");setScreen("form")}}catch(error){if(active){console.error("LINE connection failed",error);setScreen("error")}}})();return()=>{active=false}},[]);

  async function submit(event:FormEvent<HTMLFormElement>){
    event.preventDefault();const form=event.currentTarget;const data=new FormData(form);
    const phoneLocal=String(data.get("phoneNumber")||"").replace(/\D/g,"");
    const next:Record<string,string>={};if(!/^0\d{9}$/.test(phoneLocal))next.phoneNumber="กรุณากรอกเบอร์โทรศัพท์ 10 หลัก โดยขึ้นต้นด้วย 0 / Please enter 10 digits beginning with 0.";
    setErrors(next);if(Object.keys(next).length){requestAnimationFrame(()=>form.querySelector<HTMLElement>("[aria-invalid='true']")?.focus());return}
    setScreen("submitting");
    try{const accessToken=window.liff?.getAccessToken();if(!accessToken||!lineUserId)throw new Error("Your LINE session has expired. Please reopen this page from LINE.");
      const response=await fetch(APPS_SCRIPT_URL,{method:"POST",headers:{"content-type":"text/plain;charset=utf-8"},body:JSON.stringify({action:"submit_form",phoneLocal,lineUserId,accessToken,submissionSource:"LIFF GitHub Pages"}),redirect:"follow"});
      const reply=await response.json() as Reply;if(!reply.success)throw new Error(reply.message||"Unable to submit information.");
      const submittedResult={phone:reply.phoneLocal||phoneLocal,reference:reply.referenceId||reply.recordId||""};
      const confirmationText=`เบอร์โทรศัพท์ที่ลงทะเบียน: ${submittedResult.phone}`;
      const liff=window.liff;
      let confirmationSent=false;
      if(liff?.isInClient()){
        try{
          await liff.sendMessages([{type:"text",text:confirmationText}]);confirmationSent=true;
          try{
            const trackingResponse=await fetch(APPS_SCRIPT_URL,{method:"POST",headers:{"content-type":"text/plain;charset=utf-8"},body:JSON.stringify({action:"mark_line_confirmation_sent",lineUserId,accessToken,referenceId:submittedResult.reference}),redirect:"follow"});
            const trackingReply=await trackingResponse.json() as Reply;
            if(!trackingReply.success)console.error("Confirmation tracking failed",trackingReply.message);
          }catch(error){console.error("Confirmation tracking failed",error)}
        }catch(error){console.error("LINE confirmation failed",error)}
      }
      setResult({...submittedResult,confirmationSent});setScreen("result");
    }catch(error){console.error("Submission failed",error);setScreen("error")}
  }
  function clear(field:string){if(errors[field])setErrors(current=>({...current,[field]:""}))}
  const confirmation=`เบอร์โทรศัพท์ที่ลงทะเบียน: ${result.phone}`;
  return <main className="shell"><div className="container"><img className="brand" src="/deliveree-logo.png" alt="Deliveree" width={801} height={233}/><section className="card">
    {screen==="connecting"&&<Status icon="🚚" title="ยินดีต้อนรับสู่ Deliveree Driver Hub" english="Welcome to Deliveree Driver Hub" detail="กำลังเชื่อมต่อ LINE… / Connecting to LINE…"/>}
    {screen==="submitting"&&<Status icon="⏳" title="กำลังบันทึกข้อมูล" english="Submitting your information" detail="กรุณารอสักครู่ / Please wait a moment."/>}
    {screen==="error"&&<Status danger icon="!" title="LINE ของคุณยังไม่ได้เชื่อมต่อกับข้อมูลในระบบค่ะ" english="" detail="" action="ลองใหม่อีกครั้ง" actionEnglish="Try again" onAction={()=>location.reload()}/>}
    {screen==="result"&&<Status icon="✓" title="เชื่อมต่อ LINE ของคุณกับข้อมูลในระบบเรียบร้อยแล้วค่ะ" english="Your Line and profile in our system are now synced." detail="" action="กลับไปที่แชท LINE" actionEnglish="Back to LINE chat" onAction={()=>{if(result.confirmationSent&&window.liff?.isInClient()){window.liff.closeWindow()}else{location.href=OA_URL+encodeURIComponent(confirmation)}}}/>}
    {screen==="form"&&<form onSubmit={submit} className="form" noValidate>
      <label htmlFor="phoneNumber">เบอร์โทรศัพท์ที่ลงทะเบียนกับเดลิเวอรี<small>Your phone number with Deliveree</small></label>
      <input id="phoneNumber" name="phoneNumber" type="tel" required inputMode="numeric" pattern="0[0-9]{9}" maxLength={10} placeholder="0XXXXXXXXX" autoComplete="tel-national" aria-invalid={!!errors.phoneNumber} aria-describedby="phoneNumber-help phoneNumber-error" onInput={()=>clear("phoneNumber")}/>
      <em id="phoneNumber-help">กรุณากรอกตัวเลข 10 หลัก โดยขึ้นต้นด้วย 0<br/>Please enter 10 digits beginning with 0.</em>
      {errors.phoneNumber&&<em id="phoneNumber-error" className="fieldError" role="alert">{errors.phoneNumber}</em>}
      <button type="submit">ส่งข้อมูล<small>Submit</small></button></form>}

  </section></div></main>
}

function Status({icon,title,english,detail,action,actionEnglish,onAction,danger=false}:{icon:string;title:string;english:string;detail:string;action?:string;actionEnglish?:string;onAction?:()=>void;danger?:boolean}){return <div className={`status tone-${danger?"danger":"success"}`} role="status"><div className="statusIcon" aria-hidden="true">{icon}</div><h1>{title}</h1>{english&&<h2>{english}</h2>}{detail&&<p>{detail}</p>}{action&&<button type="button" onClick={onAction}>{action}{actionEnglish&&<small>{actionEnglish}</small>}</button>}</div>}
