"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var foo;
(function (foo) {
    var bar;
    (function (bar) {
        bar.a = 10;
        var b = 2;
        var myClass = /** @class */ (function () {
            function myClass() {
            }
            return myClass;
        }());
        bar.myClass = myClass;
        var doubledNo = testFunc(b);
        function testFunc(paramater) {
            return paramater * 2;
        }
    })(bar = foo.bar || (foo.bar = {}));
})(foo || (foo = {}));
//# sourceMappingURL=testfile.js.map