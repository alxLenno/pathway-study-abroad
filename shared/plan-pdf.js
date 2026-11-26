import {PDFDocument,rgb} from 'pdf-lib';
import fontkit from '@pdf-lib/fontkit';
import regularData from './fonts/NotoSans-Regular.js';
import boldData from './fonts/NotoSans-Bold.js';
const green=rgb(.09,.24,.19),ink=rgb(.16,.24,.19),muted=rgb(.42,.48,.41),line=rgb(.85,.89,.83),wash=rgb(.95,.97,.93);
export async function createPlanPdf(data){
 const doc=await PDFDocument.create();doc.registerFontkit(fontkit);
 const day=data.date||new Date().toISOString().slice(0,10);const timestamp=new Date(day+'T00:00:00Z');doc.setCreationDate(timestamp);doc.setModificationDate(timestamp);doc.setTitle('Your study abroad plan');doc.setAuthor('Pathway');doc.setProducer('Pathway study planner');doc.setCreator('Pathway');
 const regular=await doc.embedFont(regularData,{subset:true}),bold=await doc.embedFont(boldData,{subset:true});
 const width=595.28,height=841.89,margin=44,bodyWidth=width-2*margin;let page,y;
 function text(value,x,yy,size=11,font=regular,color=ink){page.drawText(String(value),{x,y:yy,size,font,color})}
 function lines(value,size,max,font=regular){const result=[];let current='';for(const word of String(value).split(/\s+/)){if(font.widthOfTextAtSize(word,size)>max){if(current){result.push(current);current=''}let part='';for(const c of word){if(font.widthOfTextAtSize(part+c,size)>max){result.push(part);part=c}else part+=c}current=part}else if(font.widthOfTextAtSize((current?current+' ':'')+word,size)>max){result.push(current);current=word}else current+=(current?' ':'')+word}if(current)result.push(current);return result}
 function paragraph(value,size=11,max=bodyWidth,font=regular,color=ink){const wrapped=lines(value,size,max,font);for(const row of wrapped){text(row,margin,y,size,font,color);y-=size*1.55}return wrapped.length}
 function newPage(){page=doc.addPage([width,height]);page.drawRectangle({x:0,y:height-134,width,height:134,color:green});text('PATHWAY  /  STUDY ABROAD',margin,height-42,11,bold,rgb(.82,.89,.77));text('Your personal study plan',margin,height-79,25,bold,rgb(1,1,1));text('A clear starting point for your next chapter.',margin,height-105,10,regular,rgb(.81,.88,.81));y=height-169}
 newPage();text('PREPARED '+day,margin,y,9,bold,muted);y-=29;paragraph('Your goals, at a glance',17,bodyWidth,bold);y-=8;
 const rows=[['STUDENT',data.name],...(data.email?[['EMAIL',data.email]]:[]),['DESTINATION',data.destination],['STUDY LEVEL',data.level],['INTENDED INTAKE',data.intake]];
 for(const[label,value]of rows){const wrapped=lines(value,11,bodyWidth-147);const rowHeight=Math.max(43,wrapped.length*17+20);if(y-rowHeight<170)newPage();page.drawRectangle({x:margin,y:y-rowHeight+8,width:bodyWidth,height:rowHeight,color:wash});text(label,margin+14,y-11,8,bold,muted);wrapped.forEach((v,i)=>text(v,margin+133,y-11-i*17,11,regular));page.drawLine({start:{x:margin,y:y-rowHeight+8},end:{x:width-margin,y:y-rowHeight+8},thickness:.6,color:line});y-=rowHeight}
 y-=27;if(y<280)newPage();paragraph('Your next steps',17,bodyWidth,bold);y-=6;
 const steps=[['Find the right course','Shortlist courses and check academic and language entry requirements.'],['Plan your budget','Compare tuition fees, living costs, scholarships, and funding options.'],['Prepare your documents','Gather academic transcripts, references, and a valid passport.'],['Check the deadlines','Confirm application, intake, and visa timelines using official sources.']];
 for(const[title,detail]of steps){if(y<145)newPage();page.drawRectangle({x:margin,y:y-2,width:10,height:10,borderWidth:.8,borderColor:muted});text(title,margin+23,y,11,bold);y-=18;for(const row of lines(detail,10,bodyWidth-23)){text(row,margin+23,y,10,regular,muted);y-=15}y-=17}
 if(y<100)newPage();y-=5;paragraph('This plan is a starting checklist, not an admission, scholarship, or visa offer. Requirements depend on your chosen institution and destination.',9,bodyWidth,regular,muted);
 doc.getPages().forEach((p,i)=>{p.drawLine({start:{x:margin,y:49},end:{x:width-margin,y:49},color:line,thickness:.6});p.drawText('PATHWAY  |  Your future, thoughtfully planned.',{x:margin,y:32,size:8,font:regular,color:muted});p.drawText(`${i+1} / ${doc.getPageCount()}`,{x:width-margin-27,y:32,size:8,font:regular,color:muted})});
 return doc.save();
}
export function pdfBase64(bytes){let value='';for(let i=0;i<bytes.length;i+=16384)value+=String.fromCharCode(...bytes.subarray(i,i+16384));return btoa(value)}
export async function downloadPlanPdf(data){const bytes=await createPlanPdf(data);const url=URL.createObjectURL(new Blob([bytes],{type:'application/pdf'}));const a=document.createElement('a');a.href=url;a.download='my-study-plan.pdf';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000)}
