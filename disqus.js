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

function pop_out_disqus_comments(I) {
    $$(I).disqusIframe()
         .each(function () {
             browser_object_follow(I.buffer, OPEN_NEW_BUFFER, this.src);
         })
         .length > 0 || I.minibuffer.message(
             "No Disqus iframes on this page!"
         );
}

define_key(default_global_keymap, "C-c d p", pop_out_disqus_comments);

function load_more_disqus_comments(I) {
    $$(I).disqus()
         .foreach($ => $("div.load-more > a.btn").not(".busy").clickthis())
         .nonempty || I.minibuffer.message(
             "No Disqus comments present, as far as I can tell."
         );
}

define_key(default_global_keymap, "C-c d m", load_more_disqus_comments);

function load_all_disqus_comments(I) {
    $$(I).disqus()
         .foreach(function ($) {
             let hasBeenVisible = false;
             $.repeat(1000, 500, function () {
                 const button = this("div.load-more > a.btn");
                 if (button.hasClass("visible")) {
                     hasBeenVisible = true;
                 } else if (hasBeenVisible) {
                     return true;
                 }
                 if (!button.hasClass("busy"))
                     button.clickthis();
                 return false;
             });
         })
        .nonempty || I.minibuffer.message(
            "No Disqus comments present, as far as I can tell."
        );
}

define_key(default_global_keymap, "C-c d a", load_all_disqus_comments);


function make_disqus_bearable($) {
    $("div#discovery-top").remove();
    $.repeat(9e9, 5000, function () {
        this("iframe#dsq-indicator-north").remove();
        this"iframe#dsq-indicator-south").remove();
        this("a.see-more").clickthis();
        return false;
    });
}

add_dom_content_loaded_hook(function (buffer) {
    $$(buffer).repeat(120, 500, function () {
        return this.disqus().foreach(make_disqus_bearable).nonempty;
    });
});
