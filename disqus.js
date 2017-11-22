"use strict";

// Copyright 2016 Sean McAfee

// This file is part of conkeror-disqus.

// conkeror-disqus is free software: you can redistribute it and/or
// modify it under the terms of the GNU General Public License as
// published by the Free Software Foundation, either version 3 of the
// License, or (at your option) any later version.

// conkeror-disqus is distributed in the hope that it will be useful,
// but WITHOUT ANY WARRANTY; without even the implied warranty of
// MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the GNU
// General Public License for more details.

// You should have received a copy of the GNU General Public License
// along with conkeror-disqus.  If not, see
// <http://www.gnu.org/licenses/>.

//
//  Routines for dealing with Disqus comments.
//

try {
    register_site_variables("disqus", function (buffer) {
        return {
            autoload_disqus_comments: function () {
                buffer.top_frame.__autoload_disqus_comments =
                    arguments.length > 0 ? arguments[0] : true;
            }
        };
    });
} catch (e) { }

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

function viewing_disqus_comments_page(window) {
    return /\bdisqus\.com\/embed\/comments\//.test(window.location);
}

$$.static.disqus = function () {
    if (viewing_disqus_comments_page(this.window)) {
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

//  "Swapping" Disqus comments means to hide the original comments
//  iframe, and replace it with the main content of the iframe.
//  Extraneous elements are removed, and a basic stylesheet is added
//  to make the remaining elements somewhat resemble their original
//  appearance.  Swapping again hides the extracted content and makes
//  the original iframe visible again.
//
//  Typically it would be more convenient to read comments in a
//  popped-out window, but popping in might be called for if one were
//  deep into a page's comments and didn't want to wait for them to be
//  re-loaded again in another window.

const DISQUS_REMOVE_SELECTORS = Object.freeze([
    "a.see-more", "ul.post-menu", "script", "footer",
    "#form", "div.nav.nav-secondary"
]);

const DISQUS_COMMENTS_STYLE = `
<style type='text/css'>
  .avatar { float: left }
  .avatar img { width: 36px; height: 36px }
</style>
`;

function disqus_comments_swapper($) {
    const iframe = $.disqusIframe().before(function () {
        const comments = $(
            $.document.importNode(
                this.contentWindow.document.getElementById("conversation"),
                true // deep copy
            )
        );
        for (let selector of DISQUS_REMOVE_SELECTORS)
            comments.find(selector).remove();
        comments.prepend(DISQUS_COMMENTS_STYLE);
        return comments.hide();
    });
    if (iframe.length == 0) {
        return None;
    } else {
        let comments = iframe.prev();
        let state = true;
        return Some(
            function () {
                (state ? iframe : comments).hide();
                state = !state;
                (state ? iframe : comments).show();
            }
        )
    }
}

function swapper_for(buffer) {
    const window = buffer.top_frame;
    return window.__conk_swapper = window.__conk_swapper ||
        disqus_comments_swapper($$(buffer));
}

function swap_disqus_comments(I) {
    swapper_for(I.buffer).foreach(f => f()).nonempty
        || I.minibuffer.message("No Disqus iframes on this page!");
}

define_key(default_global_keymap, "C-c d s", swap_disqus_comments);

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
//  Also, cleans up hyperlinks in all comments (see below).
//  Returns true if Disqus comments were found, false otherwise.

function load_all_disqus_comments($) {
    return $.disqus().foreach(function ($) {
        $("#post-list").onSubtreeMutation(clean_up_disqus_hyperlinks);
        $.disqusButton().onAttrChange(function () {
            if (!this.hasClass("busy")) this.clickthis();
        }, "class").clickthis();
    }).nonempty;
}

//  This function "cleans up" hyperlinks in Disqus comments in the
//  following way:
//
//  - Makes all hyperlinks open in a new tab.  (Conkeror often can't
//    follow links in iframes, for some reason, so the usual C-u f
//    doesn't work).
//
//  - Replaces the content of hyperlinks with the full destination
//    URL.  The original hyperlinks actually point to Disqus, with the
//    eventual destination in a "url" query parameter, which is what's
//    extracted and used.  Disqus appends a colon and a random-looking
//    string of characters to this URL, so we remove that.

function clean_up_disqus_hyperlinks() {
    const $ = this.constructor;
    const search_params = function (uri) {
        return new URLSearchParams(
            make_uri(uri).QueryInterface(Ci.nsIURL).query
        );
    };
    this.find("div.post-message a").each(function () {
        Success($(this))
            .filter(a => a.children().length === 0 && a.text().endsWith("..."))
            .foreach(a => a.attr("target", "_blank"))
            .map(a => [ a, search_params(a.attr("href")) ])
            .filter(([_, params]) => params.has("url"))
            .foreach(([a, params]) => a.text(params.get("url").replace(/(.*):.*/, "$1")))
    });
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

function load_all_disqus_comments_when_ready($) {
    $.whenFound(
        "div.load-more > a.btn",
        function () { load_all_disqus_comments($) },
        60000
    );
}

//  The following functions endeavor to tweak the behavior of the
//  Disqus interface to make it less annoying.

//  This function is applied to all Disqus content, whether in an
//  iframe or viewed directly:
//
//  1. Removes the ads at the top of the comments.  No, thank you!
//
//  2. Automatically clicks any "See More" button as soon as it
//  appears.  I hate having to do that myself over and over.
//
//  3. If the autoload argument is true, calls
//  load_all_disqus_comments() (see above) when the "Load More" button
//  appears.

function fix_disqus_content($, autoload) {
    $.whenFound("#placement-top", remove_it);
    $.onDocumentMutation(function () {
        $("a.see-more").not(".hidden").clickthis();
    });
    if (autoload) {
        if (typeof(autoload) === "number") {
            if (autoload >= 1) {
                load_all_disqus_comments_if_within_threshold($, autoload);
            }
        } else {
            load_all_disqus_comments_when_ready($);
        }
    }
}

function load_all_disqus_comments_if_within_threshold($, threshold) {
    $.whenFound("span.comment-count", function () {
        const match = this.text().match(/^\s*(\d+)\b/);
        if (match && parseInt(match[1], 10) <= threshold)
            load_all_disqus_comments_when_ready($);
    });
}

//  This function looks for an embedded Disqus comments iframe for up
//  to sixty seconds.  When found, it fixes the iframe's content as
//  per fix_disqus_content() above, and also removes the "indicator"
//  iframes that inform the user that more comments have been posted
//  above or below the currently visible portion of the comments.
//  God, those are irritating.

function fix_disqus_iframe($) {
    $.whenFound(
        "#disqus_thread > iframe[src*='disqus.com/embed/comments/']",
        function (iframes) {
            const iframe = iframes[0];
            $.whenFound("#indicator-north", remove_it)
             .whenFound("#indicator-south", remove_it);
            iframe.addEventListener("load", function () {
                fix_disqus_content(
                    $$(iframe.contentWindow),
                    $.window.__autoload_disqus_comments
                );
            });
        },
        60000
    );
}

//  This function is applied to Disqus pages that show content
//  directly.

function fix_disqus_comments_page($) {
    // Override stylesheet's "html { overflow: hidden }" rule
    // that hides scrollbars and prevents scrolling during
    // text searches:
    $("html").attr("style", "overflow: visible");
    fix_disqus_content($);
}

//  Top level entry point for Disqus tweaks.  Dispatches to the
//  appropriate function depending on whether we're viewing a Disqus
//  comments page directly, or might have an embedded Disqus iframe.

function make_disqus_bearable(buffer) {
    const $ = $$(buffer);
    if (viewing_disqus_comments_page($.window)) {
        fix_disqus_comments_page($);
    } else {
        fix_disqus_iframe($);
    }
}

add_dom_content_loaded_hook(make_disqus_bearable);
