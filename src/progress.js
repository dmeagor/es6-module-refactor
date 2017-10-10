var ProgressBar = require('progress');
var bar = new ProgressBar(':bar', { total: 10 });
for (var a = 1; a <= 10; a++)
    bar.tick();
bar = new ProgressBar(':bar', { total: 10 });
for (var a = 1; a <= 10; a++)
    bar.tick();
//# sourceMappingURL=progress.js.map