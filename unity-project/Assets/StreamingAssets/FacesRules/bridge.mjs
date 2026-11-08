import { createInterface } from 'node:readline';
import { mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { handle } from './match-bridge.mjs';

const work = mkdtempSync(join(tmpdir(), 'faces-and-heels-'));
const clipPath = join(work, 'motion.bin');
const reader=createInterface({input:process.stdin,crlfDelay:Infinity});
try {
    for await (const line of reader) {
        try {
            const response=handle(JSON.parse(line));
            writeFileSync(clipPath,response.clip);
            response.clip=clipPath;
            process.stdout.write(JSON.stringify(response)+'\n');
        }catch(error){
            process.stdout.write(JSON.stringify({error:error.message})+'\n');
        }
    }
}finally{
    rmSync(clipPath,{force:true});
    rmSync(work,{force:true,recursive:true});
}
