import http from 'node:http';
import { readFile } from 'node:fs/promises';
import { Readable } from 'node:stream';
import worker from '../worker/index.js';
const vars = Object.fromEntries((await readFile(new URL('../.dev.vars',import.meta.url),'utf8')).split(/\r?\n/).filter(line=>line&&!line.startsWith('#')).map(line=>{const at=line.indexOf('=');return[line.slice(0,at),line.slice(at+1)];}));
const port=Number(process.env.PORT || 5174);
http.createServer(async(req,res)=>{
  const controller=new AbortController();req.once('aborted',()=>controller.abort());res.once('close',()=>controller.abort());
  try {
    const request = new Request(`http://127.0.0.1:${port}${req.url}`,{method:req.method,headers:req.headers,body:['GET','HEAD'].includes(req.method)?undefined:Readable.toWeb(req),duplex:'half',signal:controller.signal});
    const response=await worker.fetch(request,vars);
    res.statusCode=response.status;
    for(const[key,value]of response.headers)if(key!=='set-cookie')res.setHeader(key,value);
    const cookies=response.headers.getSetCookie();if(cookies.length)res.setHeader('set-cookie',cookies);
    if(response.body){const stream=Readable.fromWeb(response.body);stream.on('error',()=>{if(!res.writableEnded)res.end();});stream.pipe(res);}else res.end();
  } catch {if(!res.headersSent)res.statusCode=503;res.end('The admin service is unavailable.');}
}).listen(port,'127.0.0.1',()=>console.log(`Admin: http://127.0.0.1:${port}/admin/login`));
