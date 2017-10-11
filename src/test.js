"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var ts_simple_ast_1 = require("ts-simple-ast");
var basePath = "c:/Users/dmeag/Source/Repos/singletest/";
// start typescript compiler api helper
var ast = new ts_simple_ast_1.default();
//add ts project
//ast.addSourceFiles("../shout/FreeSurvey.Web.Mvc/Shout/**/*{.d.ts,.ts}");
//ast.addSourceFiles("../test/VideoTour/**/*{.d.ts,.ts}");
ast.addSourceFiles("../singletest/test.ts");
var sourceFiles = ast.getSourceFiles();
console.log("\n------ start");
sourceFiles.forEach(function (sourceFile) {
    // const propertyAccessExpressions = sourceFile.getDescendantsOfKind(ts.SyntaxKind.PropertyAccessExpression);
    var nodes = sourceFile.getDescendants();
    nodes.forEach(function (n) {
        if (ts_simple_ast_1.TypeGuards.isTypeReferenceNode(n)) {
            console.log("TRN: getText=" + n.getText());
        }
        else if (ts_simple_ast_1.TypeGuards.isPropertyAccessExpression(n)) {
            console.log("PAE: getText=" + n.getText() + " getName=" + n.getName());
        }
    });
});
console.log("------ end");
function absoluteToRelativePath(path) {
    return path.replace(basePath, "");
}
//# sourceMappingURL=test.js.map