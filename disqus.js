//
//  Routines for dealing with Disqus comments.
//

//  Useful jQuery methods:

//  This static method returns a jQuery object wrapping the iframe
//  element on the current page that contains the page's Disqus
//  comments.  If there is no such element, the returned jQuery object
//  will be empty.

$$.static.disqusIframe = function () {
    return this("iframe[src*='disqus.com/embed/comments/']").eq(0);
}

//  This static method returns a jQuery object for the document
//  containing the current page's Disqus comments.  If the current
//  page is itself a Disqus comments page (perhaps obtained by calling
//  the pop_out_disqus_comments function below), then the invocant
//  jQuery object is returned; otherwise, a jQuery object for the
//  Disqus comments iframe on the current page is returned.
//
//  Actually, a Maybe object is returned.  If Disqus comments are
//  found via either of the above methods, a Some object wrapping a
//  jQuery object is returned; otherwise a None object is returned.

$$.static.disqus = function () {
    if (/\bdisqus\.com\/embed\/comments\//.test(this.window.location)) {
        return Some(this);
    } else {
        return this.disqusIframe().enterIframe();
    }
};

//  This static method returns a jQuery object wrapping the Disqus
//  "See More Comments" button on the current page or frame.  If no
//  such button is found, the object will be empty.

$$.static.disqusButton = function () {
    return this("div.load-more > a.btn");
};

//  This function opens a new page referring directly to the comments
//  in the current page's iframe, if any.

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

//  This function essentially just clicks on the "See More Comments"
//  button once, loading another batch of comments.

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

//  This function clicks on the "See More Comments" button repeatedly,
//  for a long as it appears, loading all available comments.
//  Returns true if Disqus comments were found, false otherwise.

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

function remove_it(arg) {
    arg.remove();
}

//  This function endeavors to tweak the behavior of the Disqus
//  interface to make it less annoying.  It is a buffer-loaded hook
//  that looks for a Disqus comments iframe on every page Conkeror
//  loads (for a maximum of twenty seconds) and performs the following
//  steps when one is found:
//
//  1. Removes the "indicator" iframes that inform the user that more
//  comments have been posted above or below the currently visible
//  portion of the comments.  God, those are irritating.
//
//  2. Removes the ads at the top of the comments.  No, thank you!
//
//  3. Automatically clicks any "See More" button as soon as it
//  appears.  I hate having to do that myself over and over.
//
//  4. If the buffer's window has an __autoload_disqus_comments value
//  that is true, calls load_all_disqus_comments() (see above).

function make_disqus_bearable(buffer) {
    const $top = $$(buffer);
    $top.whenFound(
        "#disqus_thread > iframe[src*='disqus.com/embed/comments/']",
        function ([iframe]) {
            for (let dir of ["north", "south"]) {
                $top.whenFound("#dsq-indicator-" + dir, remove_it);
            }
            iframe.addEventListener("load", function () {
                const $ = $$(iframe.contentWindow);
                $.onDocumentMutation(
                    function () {
                        $("a.see-more").not(".hidden").clickthis();
                    }
                );
                $.whenFound("#discovery-top", remove_it);
                if (buffer.top_frame.__autoload_disqus_comments) {
                    $.whenFound(
                        "div.load-more > a.btn",
                        function () { load_all_disqus_comments($) },
                        20000
                    );
                }
            });
        },
        20000
    );
}

add_dom_content_loaded_hook(make_disqus_bearable);
