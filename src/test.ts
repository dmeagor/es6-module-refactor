import Ast, { SourceFile, TypeGuards, ImportDeclarationStructure}  from "ts-simple-ast";
import * as ts from "typescript";


const basePath="c:/Users/dmeag/Source/Repos/singletest/"

// start typescript compiler api helper
const ast = new Ast();

//add ts project
//ast.addSourceFiles("../shout/FreeSurvey.Web.Mvc/Shout/**/*{.d.ts,.ts}");
//ast.addSourceFiles("../test/VideoTour/**/*{.d.ts,.ts}");
ast.addSourceFiles("../singletest/test.ts");

const sourceFiles = ast.getSourceFiles();

console.log("\n------ start")

var base='shout.builder.question';
console.log(base,"");
getNewQualifiedname('shout.builder.ISomething');
getNewQualifiedname('shout.builder.doh.ISomething');
getNewQualifiedname('shout.builder.question.ISomething');
getNewQualifiedname('shout.builder.question.data.ISomething');
getNewQualifiedname('shout.builder.question.deeper.data.ISomething');
getNewQualifiedname('shout.data.ISomething');
getNewQualifiedname('sdfsdfg.data.ISomething');


console.log("------ end")

function getNewQualifiedname(old:string){

    var o : string[] = old.split('.');
    var newName: string;

    if (o.length==1){
        newName= o[0]
    }else{
        var firstBit = toCamelCase(o.slice(0,o.length-1));  
        var lastBit = o[o.length-1];
        newName = firstBit+"."+lastBit;
    }
    
    console.log(old,newName);
    
    return newName;
}


function toCamelCase(o: string[]){
    var n:string;
    const capitalize = str => str.charAt(0).toUpperCase() + str.toLowerCase().slice(1)    

    for(var i=0;i<o.length;i++){
        if (i==0) 
            n=o[i];
        else 
            n=n+capitalize(o[i]);
    }
    return n
}


// returns 0 if same namespace, >0 if deeper namespace or -1 if different or any parent namespace
function matchFromStart(base: string[], comparator : string[]) : number{
    
let i=0;

while(i<comparator.length && i<base.length && base[i]===comparator[i]) i++;     

return i

}

/*
// returns 0 if same namespace, >0 if deeper namespace or -1 if different or any parent namespace
function matchFromStart(base: string[], comparator : string[]) : number{
        
    let i=0;

    while(i<comparator.length && i<base.length && base[i]===comparator[i]) i++;     

    let extra=comparator.length-i;

    if (i<base.length) extra=-1;
    return extra;

}*/

function absoluteToRelativePath(path:string) : string {

    return path.replace(basePath,"");
}
