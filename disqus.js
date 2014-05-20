$$.static.nuke_disqus_indicators = function () {
    [ "north", "south" ].forEach(function (dir) {
        this.repeat(9e9, 2000, function () {
            return this("iframe#dsq-indicator-" + dir).remove();
        });
    }, this);
};

$$.static.load_all_disqus_comments = function () {
    this.repeat(1000, 500, function () {
        let button = this("div#disqus_thread > iframe[src*='/embed/comments/']")
            .inIframe("div.load-more > a");
        if (!button.is(":visible")) return true;
        button.not(".busy").clickthis();
        return false;
    });
};

$$.static.load_all_disqus_comments2 = function () {
    let hasBeenVisible = false;
    this.repeat(1000, 500, function () {
        const button = this("div.load-more > a.btn")
        if (button.is(":visible")) {
            hasBeenVisible = true;
        } else if (hasBeenVisible) {
            return true;
        }
        if (!button.hasClass("busy"))
            button.clickthis();
        return false;
    });
};

$$.static.make_disqus_bearable = function () {
    this.nuke_disqus_indicators();
    this.load_all_disqus_comments();
};
