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

// function make_disqus_bearable($) {
//     $("div#discovery-top").remove();
//     $.repeat(9e9, 5000, function () {
//         this("iframe#dsq-indicator-north").remove();
//         this"iframe#dsq-indicator-south").remove();
//         this("a.see-more").clickthis();
//         return false;
//     });
// }

function is_disqus_iframe(node) {
    return node.tagName == "IFRAME" &&
        /disqus\.com\/embed\/comments\//.test(node.getAttribute("src"));
}

function when_element_has_descendant(root, predicate, callback, timeout) {
    const result = predicate(root);
    if (result) {
        callback(result);
        return;
    }

    const window = root.ownerDocument.defaultView;

    const observer = new window.MutationObserver(
        function () {
            const result = predicate(root);
            if (result) {
                callback(result);
                observer.disconnect();
            }
        }
    );

    observer.observe(
        root, { childList: true, subtree: true }
    );

    if (timeout) {
        window.setTimeout(
            function () { observer.disconnect() }, timeout
        );
    }

}

add_dom_content_loaded_hook(function (buffer) {
    when_element_has_descendant(
        buffer.document.documentElement,
        () => buffer.document.getElementById("disqus_thread"),
        function (dt) {
            when_element_has_descendant(
                dt,
                function () {
                    const children = dt.childNodes;
                    for (let i = 0; i < children.length; ++i) {
                        const child = children[i];
                        if (is_disqus_iframe(child)) {
                            return child;
                        }
                    }
                    return null;
                },
                function (iframe) {
                    iframe.addEventListener("load", function () {
                        const $ = $$(iframe.contentWindow);
                        when_element_has_descendant(
                            $.document.documentElement,
                            () => $.document.getElementById("discovery-top"),
                            elem => $(elem).remove(),
                            20000
                        );
                        if (buffer.top_frame.__autoload_disqus_comments) {
                            when_element_has_descendant(
                                $.document.documentElement,
                                function () {
                                    return $.disqusButton().length > 0;
                                },
                                function () {
                                    load_all_disqus_comments($);
                                },
                                20000
                            );
                        }
                    });
                }
            )
        },
        10000
    );

});
