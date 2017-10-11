var foo;
(function (foo) {
    var bar;
    (function (bar) {
        var notThisOne = /** @class */ (function () {
            function notThisOne() {
            }
            notThisOne.prototype.name = function (d) {
            };
            return notThisOne;
        }());
        var a = new foo.smith.someClass();
        var b = foo.smith.someFunction(12456);
        var c = 1;
    })(bar = foo.bar || (foo.bar = {}));
})(foo || (foo = {}));
//# sourceMappingURL=test.js.map