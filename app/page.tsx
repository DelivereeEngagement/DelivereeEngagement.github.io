"use client";
import { FormEvent, useEffect, useState } from "react";

const LIFF_ID = "2010741545-WOEIhIFQ";
const APPS_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbwiK82lzhH5CM53CVElVJKsTORSVPamI91JmZNJC39QICS_hPlG9irseKKo4o8Bbd3-eA/exec";
const OA_URL = "https://line.me/R/oaMessage/%40deliveree_driver/";
type Screen = "connecting" | "form" | "submitting" | "result" | "error" | "external" | "confirmation-error" | "link-error";
type LiffApi = { init(o:{liffId:string}):Promise<void>; isLoggedIn():boolean; isInClient():boolean; login(o?:{redirectUri?:string}):void; closeWindow():void; getAccessToken():string|null; getProfile():Promise<{userId:string;displayName:string}>; sendMessages(messages:Array<{type:"text";text:string}>):Promise<void> };
type Reply = { success?:boolean; message?:string; referenceId?:string; recordId?:string; name?:string; phoneLocal?:string; freshchatLinked?:boolean; errorCode?:string; confirmationSent?:boolean };
declare global { interface Window { liff?: LiffApi } }

function waitForLiff():Promise<LiffApi>{
  return new Promise((resolve,reject)=>{const start=Date.now();const timer=setInterval(()=>{if(window.liff){clearInterval(timer);resolve(window.liff)}else if(Date.now()-start>12000){clearInterval(timer);reject(new Error("The LINE connection library could not be loaded."))}},50)});
}

export default function Home(){
  const [screen,setScreen]=useState<Screen>("connecting");
  const [lineUserId,setLineUserId]=useState("");
  const [registrationToken,setRegistrationToken]=useState("");
  const [result,setResult]=useState({phone:"",reference:"",confirmationSent:false});
  const [errors,setErrors]=useState<Record<string,string>>({});

  useEffect(()=>{let active=true;(async()=>{try{const liff=await waitForLiff();await liff.init({liffId:LIFF_ID});
      // LIFF restores query parameters during init; read only after it resolves.
      const tokens=new URL(location.href).searchParams.getAll("registrationToken");
      if(tokens.length>1||(tokens.length===1&&!/^[A-Za-z0-9_-]{43}$/.test(tokens[0]))){if(active)setScreen("link-error");return}
      if(active)setRegistrationToken(tokens[0]||"");
      if(!liff.isInClient()){if(active)setScreen("external");return}if(!liff.isLoggedIn()){liff.login({redirectUri:location.href.split("#")[0]});return}const profile=await liff.getProfile();if(!liff.getAccessToken())throw new Error("LINE did not provide an access token.");if(active){setLineUserId(profile.userId||"");setScreen("form")}}catch(error){if(active){console.error("LINE connection failed",error);setScreen("error")}}})();return()=>{active=false}},[]);

  async function submit(event:FormEvent<HTMLFormElement>){
    event.preventDefault();const form=event.currentTarget;const data=new FormData(form);
    const phoneLocal=String(data.get("phoneNumber")||"").replace(/\D/g,"");
    const next:Record<string,string>={};if(!/^0\d{9}$/.test(phoneLocal))next.phoneNumber="กรุณากรอกเบอร์โทรศัพท์ 10 หลัก โดยขึ้นต้นด้วย 0";
    setErrors(next);if(Object.keys(next).length){requestAnimationFrame(()=>form.querySelector<HTMLElement>("[aria-invalid='true']")?.focus());return}
    setScreen("submitting");
    try{const accessToken=window.liff?.getAccessToken();if(!accessToken||!lineUserId)throw new Error("Your LINE session has expired. Please reopen this page from LINE.");
      const response=await fetch(APPS_SCRIPT_URL,{method:"POST",headers:{"content-type":"text/plain;charset=utf-8"},body:JSON.stringify({action:"submit_form",phoneLocal,lineUserId,accessToken,submissionSource:"LIFF GitHub Pages",...(registrationToken?{registrationToken}:{})}),redirect:"follow"});
      const reply=await response.json() as Reply;
      if(reply.errorCode==="REGISTRATION_LINK_INVALID"){setScreen("link-error");return}
      if(!reply.success)throw new Error(reply.message||"Unable to submit information.");
      if(registrationToken&&!reply.freshchatLinked)throw new Error("The registration backend needs updating.");
      const submittedResult={phone:reply.phoneLocal||phoneLocal,reference:reply.referenceId||reply.recordId||""};
      setResult({...submittedResult,confirmationSent:false});
      if(reply.confirmationSent){setResult({...submittedResult,confirmationSent:true});setScreen("result")}
      else await sendConfirmation(submittedResult,accessToken);

    }catch(error){console.error("Submission failed",error);setScreen("error")}
  }
  async function sendConfirmation(submittedResult:{phone:string;reference:string},accessToken:string){
    const liff=window.liff;
    if(!liff?.isInClient()){setScreen("external");return}
    try{
      await liff.sendMessages([{type:"text",text:`เบอร์โทรศัพท์ที่ลงทะเบียน: ${submittedResult.phone}`}]);
    }catch(error){console.error("LINE confirmation failed",error);setScreen("confirmation-error");return}
    setResult({...submittedResult,confirmationSent:true});setScreen("result");
    try{
      const response=await fetch(APPS_SCRIPT_URL,{method:"POST",headers:{"content-type":"text/plain;charset=utf-8"},body:JSON.stringify({action:"mark_line_confirmation_sent",lineUserId,accessToken,referenceId:submittedResult.reference}),redirect:"follow"});
      const reply=await response.json() as Reply;
      if(!reply.success)console.error("Confirmation tracking failed",reply.message);
    }catch(error){console.error("Confirmation tracking failed",error)}
  }
  async function retryConfirmation(){
    const accessToken=window.liff?.getAccessToken();
    if(!accessToken){setScreen("error");return}
    setScreen("submitting");await sendConfirmation(result,accessToken);
  }
  function clear(field:string){if(errors[field])setErrors(current=>({...current,[field]:""}))}
  return <main className="shell"><div className="container"><img className="brand" src="/deliveree-logo.png" alt="Deliveree" width={801} height={233}/><section className="card">
    {screen==="connecting"&&<Status icon="🚚" title="ยินดีต้อนรับสู่ LINE OA สำหรับผู้ขนส่งเดลิเวอรี!" detail="กำลังเชื่อมต่อ LINE…"/>}
    {screen==="external"&&<Status icon="🚚" title="ยินดีต้อนรับสู่ LINE OA สำหรับผู้ขนส่งเดลิเวอรี!" detail="กรุณาเปิดแบบฟอร์มจากเมนูในแชท LINE OA เพื่อส่งข้อความยืนยันอัตโนมัติ" action="กลับไปที่แชท LINE" onAction={()=>{location.href=OA_URL}}/>}
    {screen==="submitting"&&<Status icon="⏳" title="กำลังบันทึกข้อมูล" detail="กรุณารอสักครู่"/>}
    {screen==="link-error"&&<Status danger icon="!" title="ลิงก์ลงทะเบียนนี้ไม่สามารถใช้งานได้แล้วค่ะ" detail="กรุณากลับไปที่แชทเพื่อใช้ลิงก์ล่าสุด หรือติดต่อเจ้าหน้าที่เพื่อขอลิงก์ใหม่ และอย่าส่งต่อลิงก์ส่วนตัวให้ผู้อื่นค่ะ" action="กลับไปที่แชท LINE" onAction={()=>{if(window.liff?.isInClient())window.liff.closeWindow();else location.href=OA_URL}}/>}
    {screen==="error"&&<Status danger icon="!" title="LINE ของคุณยังไม่ได้เชื่อมต่อกับข้อมูลในระบบค่ะ" detail="" action="ลองใหม่อีกครั้ง" onAction={()=>location.reload()}/>}
    {screen==="confirmation-error"&&<Status danger icon="!" title="บันทึกเบอร์โทรศัพท์เรียบร้อยแล้วค่ะ" detail="ยังส่งข้อความยืนยันอัตโนมัติไม่สำเร็จ กรุณาลองใหม่อีกครั้ง หากยังไม่สำเร็จ กรุณาเปิดแบบฟอร์มจากเมนูในแชท LINE OA" action="ลองใหม่อีกครั้ง" onAction={retryConfirmation}/>}
    {screen==="result"&&<Status icon="✓" title="เชื่อมต่อ LINE ของคุณกับข้อมูลในระบบเรียบร้อยแล้วค่ะ" detail="" action="กลับไปที่แชท LINE" onAction={()=>{window.liff?.closeWindow()}}/>}
    {screen==="form"&&<form onSubmit={submit} className="form" noValidate>
      <label htmlFor="phoneNumber">เบอร์โทรศัพท์ที่ลงทะเบียนกับเดลิเวอรี</label>
      <input id="phoneNumber" name="phoneNumber" type="tel" required inputMode="numeric" pattern="0[0-9]{9}" maxLength={10} placeholder="0XXXXXXXXX" autoComplete="tel-national" aria-invalid={!!errors.phoneNumber} aria-describedby="phoneNumber-help phoneNumber-error" onInput={()=>clear("phoneNumber")}/>
      <em id="phoneNumber-help">กรุณากรอกตัวเลข 10 หลัก โดยขึ้นต้นด้วย 0</em>
      {errors.phoneNumber&&<em id="phoneNumber-error" className="fieldError" role="alert">{errors.phoneNumber}</em>}
      <button type="submit">ส่งข้อมูล</button></form>}

  </section></div></main>
}

function Status({icon,title,detail,action,onAction,danger=false}:{icon:string;title:string;detail:string;action?:string;onAction?:()=>void;danger?:boolean}){return <div className={`status tone-${danger?"danger":"success"}`} role="status"><div className="statusIcon" aria-hidden="true">{icon}</div><h1>{title}</h1>{detail&&<p>{detail}</p>}{action&&<button type="button" onClick={onAction}>{action}</button>}</div>}
