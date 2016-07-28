# SUMMARY

`conkeror-disqus` is a Conkeror package that provides features
relating to the Disqus comment hosting service.

# FEATURES

## Comments Autoload

If so configured, Disqus comments are loaded in their entirety
whenever any web page with a Disqus comment section is visited, if the
advertised number of comments does not exceed a configurable
threshold.  That is, the Disqus "See more comments" button is
repeatedly and automatically pressed until no more comments are
available.

## Global key mappings

Various commands are attached to the global keymap under the prefix
sequence `Control-c d`.  Most are agnostic to whether Disqus comments
are embedded in an iframe or present in the main page, and work
equally well in either case.

- `Control-c d m` - load more comments

  Clicks the "See More Comments" button once, if there is one.
  
- `Control-c d a` - load all comments

  Clicks the "See More Comments" button repeatedly until no more
  comments are available.  As noted above, this is often done
  automatically on any page that sports Disqus comments, but not if
  the stated number of comments exceeds a threshold.  This command
  loads all comments regardless of how many there are.

- `Control-c d p` - pop out comments

  If the current page has a Disqus comments iframe element, that
  element is "popped out" into its own buffer.
  
  This is mostly useful for getting around limitations in some earlier
  versions of Conkeror that keep clickable elements in Disqus iframes
  from being located.
  
- `Control-c d s` - swap out comments

  An alternative to `Control-c d p` intended to solve the same
  problem, this command "swaps out" a Disqus iframe with the same
  content, but embedded in the main window.  Various tweaks are made
  to the content in an attempt to make each comment take up about as
  much space as it does when embedded in the original iframe.
  
  Issuing the command again restores the original iframe.
  
## Content Tweaks

I find some aspects of Disqus's presentation annoying, and this
package mitigates my irritation somewhat.

- Comments which Disqus judges to be too long are shown only in part,
  and one must click a "See more" button to show the full content.
  This package automatically clicks on all such buttons.
  
- Ads at the top of the comments are removed.

- Removes the "indicator" elements that appear at the top and/or
  bottom of the window to "helpfully" inform a viewer how many new
  comments have been posted above and below.

# DEPENDENCIES

- [conkeror-jquery](../conkeror-jquery)
