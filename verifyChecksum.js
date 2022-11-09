import * as fs from "fs";
import * as crypto from 'crypto';
import fg from "fast-glob";

(async () => {
    const files = await fg("./2 Turno/VotosLogs/*.csv", { onlyFiles: true });

    for(let file of files){
        const data = await fs.readFileSync(file, "utf-8");
        const hash = crypto.createHash('sha256').update(data).digest('hex');
        const data2 = await fs.readFileSync(file.replace("VotosLogs", "VotosLogs05-11"), "utf-8");
        const hash2 = crypto.createHash('sha256').update(data2).digest('hex');

        if(hash !== hash2)
            console.log(`File ${file} is corrupted`);
        else 
            console.log(`File ${file} is ok`);
    }
})();