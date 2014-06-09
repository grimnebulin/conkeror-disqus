$$.static.disqusIframe = function () {
    return this("iframe[src*='disqus.com/embed/comments/']").eq(0);
}

$$.static.disqus = function () {
    if (/\bdisqus\.com\/embed\/comments\//.test(this.window.location)) {
        return Some(this);
    } else {
        return this.disqusIframe().enterIframe();
    }
};

$$.static.disqusButton = function () {
    return this("div.load-more > a.btn");
};

function pop_out_disqus_comments(I) {
    $$(I)
        .disqusIframe()
        .each(function () {
            browser_object_follow(I.buffer, OPEN_NEW_BUFFER, this.src);
        })
        .length > 0
    || I.minibuffer.message("No Disqus iframes on this page!");
}

define_key(default_global_keymap, "C-c d p", pop_out_disqus_comments);

function load_more_disqus_comments(I) {
    $$(I)
        .disqus()
        .foreach($ => $.disqusButton().not(".busy").clickthis())
        .nonempty
    || I.minibuffer.message(
        "No Disqus comments present, as far as I can tell."
    );
}

define_key(default_global_keymap, "C-c d m", load_more_disqus_comments);

function load_all_disqus_comments($) {
    return $.disqus().foreach(function ($) {
        $.disqusButton().onAttrChange(function () {
            if (!this.hasClass("busy")) this.clickthis();
        }, "class").clickthis();
    }).nonempty;
}

define_key(
    default_global_keymap,
    "C-c d a",
    function (I) {
        if (!load_all_disqus_comments($$(I))) {
            I.minibuffer.message("No Disqus comments present.");
        }
    }
);

add_dom_content_loaded_hook(function (buffer) {
    const $top = $$(buffer);
    $top.whenFound(
        "#disqus_thread > iframe[src*='disqus.com/embed/comments/']",
        function ([iframe]) {
            for (let dir of ["north", "south"]) {
                $top.whenFound(
                    "#disqus-indicator-" + dir,
                    function (x) { x.remove() }
                );
            }
            iframe.addEventListener("load", function () {
                const $ = $$(iframe.contentWindow);
                $.onDocumentMutation(
                    function () {
                        $("a.see-more").not(".hidden").clickthis();
                    }
                );
                $.whenFound("#discovery-top", function (x) { x.remove() });
                if (buffer.top_frame.__autoload_disqus_comments) {
                    $.whenFound(
                        "div.load-more > a.btn",
                        function () { load_all_disqus_comments($) },
                        20000
                    );
                }
            });
        },
        10000
    );
});
