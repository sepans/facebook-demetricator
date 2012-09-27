// ==UserScript==
// @name Facebook Demetricator
// @version 0.8
// @namespace facebookdemetricator
// @description Removes All The Metrics From Facebook
//
// @match *://*.facebook.com/*
// @include *://*.facebook.com/*
// @exclude *://*.facebook.com/ai.php*
// @exclude *://*.facebook.com/ajax/*
//
// @icon http://bengrosser.com/share/fbd-icon.png
//
// ==/UserScript==// -----------------------------------------


// Facebook Demetricator
// by Benjamin Grosser
// http://bengrosser.com
//
// Winner of a Terminal Award for 2012-13
// http://terminalapsu.org
//
// version 0.8
// -----------------------------------------


// NOTES:
// -----
// There's more structural messiness here than I'd like, largely due to the fact that 
// Facebook is messy.  The same type of text will be represented in many different ways
// throughout their code.  As a result, while I've written some functions for more common
// operations, a lot of them get their own snippets of code for the demetrication.  On
// my next pass, I intend to write some more generic functions that can accept parms
// from each of these selector loops to clean up the code quite a bit.


// THANKS to my beta test team!! 
// Selina, Hugh, Jeff, Dan B., Dan G., Keith, Ashley, Janelle, Elizabeth, Keri, Kate



// TODO
// recommended pages (N people like this) (hatcher)
// reentering a previously viewed ticker popup when toggle changed between doesn't update popup content
// code cleanup/refactoring
//
// TODO for 0.8
// chrome extension test
// git tests


// globals
var startURL;                       // page that loaded the userscript                              
var curURL;                         // supposed url of the current page
var j;                              // jQuery
var demetricatorON = true;          // loads ON by default
var currentChatCount;               // tracks the chat count
var currentMoreChatCount;
var currentLikeCount;               // for tracking likes in the dialog
var currentTitleText;               // current (non-metric) count of $('title')


// constants
var FADE_SPEED = 175;               // used in jQuery fadeIn()/fadeOut()
var ELEMENT_POLL_SPEED = 500;       // waitForKeyElements polling interval 
var RIBBON_TEXT_COLOR = "rgb(59,89,152)"; // TODO change this to opacity
var LINK_HIGHLIGHT_ON = false;      // debugging
var VERSION_NUMBER = '0.8b';        // used in the console logging
var DBUG = false;                   // more debugging
var KEY_CONTROL = true;
var FAN_PAGE_URL = 'http://bengrosser.com';
var DEMETRICATOR_HOME_URL = 'http%3A%2F%2Fbengrosser.com/projects/facebook-demetricator/';
var GROSSER_URL = 'http://bengrosser.com/';
var IS_FIREFOX_ADDON = false;        // is this a firefox addon?
var IS_SAFARI_EXTENSION = true;        // is this a firefox addon?


// CSS classes that get polled for changes every 500ms.  these 
// are the primary blocks that get inserted dynamically
// by FB when you scroll, click, hover, etc.  they clue me in to 
// new changes in the page that need demetrication. it's a bit of 
// a blunt instrument but i've pared this list down to the minimum
var keyElements = [
    '.uiStreamStory',               // newsfeed story blocks
    '.fbTimelineUnit',              // each block in the timeline
    '.jewelContent li',             // blocks in notification icon dropdowns
    '.notification',                // same as above
    '.fbProfileBrowserList',        // new friend blocks in timeilne view
    '.uiFavoritesStory',            // likes
    '.appsListItem',                // app center blocks
    '.fbTimelineTabHeader',         // header info on timeline photo/video album blocks
    '.ego_section',                 // right sidebar blocks, sometimes are dynamic
    '.fbPhotosGrid tr'
];


// jQuery selectors that fade in/out on toggle
var fadeClasses = [
    '.facebookmetric_fade'
];


// jQuery selectors that hide/show on toggle
var hideShowClasses = [
    '.facebookmetric_hideshow',
    '.FriendRequestIncoming i',      // +1 part of '+1 Respond to Friend Request' buttons
    '.FriendRequestOutgoing i'      // +1 part of '+1 Respond to Friend Request' buttons
];


// some metrics need to be set to opacity:0 instead of hidden, so that the space 
// they occupy doesn't collapse
var opacityClasses = [
    '.fbtimelineblockcount',
    '.fbTimelineHeadlineStats',
    '.photoText .fsm.fwn.fcg',
    '.facebookmetric_opacity'

];
    

// sometimes metrics need to be swapped with something else (e.g. generic text)
// there are toggleON and toggleOFF classes, corresponding to demetrication states
var toggleOnOffClasses = [
    '.facebookmetric_toggle'
];


// cleaner syntax than match()
String.prototype.contains = function(it) { return this.indexOf(it) != -1; };


// called whenever the checkbox is toggled to fade/hide/show metrics in/out
function toggleDemetricator() {

    if(demetricatorON) {

        if(DBUG) console.time('demetricatorON timer');
        console.time('demetricatorON timer');

        // red/white top-left notification icons
        j('#jewelContainer span.facebookmetricreq').fadeOut(FADE_SPEED);
        j('#jewelContainer span.facebookmetricmsg').fadeOut(FADE_SPEED);
        j('#jewelContainer span.facebookmetricnot').fadeOut(FADE_SPEED);

        // after fading the metric, hide its parent
        setTimeout(function() {
            j('.facebookmetricreqp').hide();
            j('.facebookmetricmsgp').hide();
            j('.facebookmetricnotp').hide();
        }, 500);

        // re-run demetricate() in case of new content
        demetricate();

        // fade out all selectors in fadeClasses
        j.each(fadeClasses, function(index, value) { j(value).fadeOut(); });

        // hide all selectors in hideShowClasses
        j.each(hideShowClasses, function(index, value) { j(value).hide(); });
        
        // hide all toggle classes in toggleOnOffClasses
        j.each(toggleOnOffClasses, function(index, value) { 
            j(value+'OFF').hide();
            j(value+'ON').show();
        });

        // lower right-hand corner chat button
        j('.chatnumber').fadeOut(FADE_SPEED);

        // drop-down on the timeline ribbon
        j('.fbTimelineMoreButton').find('.fbTimelineRibbon').find('.text').animate({color:"#fff"}, FADE_SPEED);

        // a few metrics need to fade out while holding their space
        j.each(opacityClasses, function(index, value) { j(value).animate({opacity:0}, FADE_SPEED); });

        // view all XX comments
        j('.fbviewallcomments').each(function() { j(this).attr('value',j(this).attr('newvalue')); });

        // timeline add friend +1 icons
        j('#pagelet_friends span.FriendLink i').hide();
        j('#pagelet_friends span.FriendLink a').css('padding-left','0px');

        // newsfeed attachment +1 icons
        j('.addButton i').not('.FriendRequestAdd').hide();
        j('.addButton').not('.FriendRequestAdd').css('padding-left','0px');

        // event and timeline activity counts (possibly elsewhere)
        j('.counter').fadeOut(FADE_SPEED);

        if(DBUG) console.timeEnd('demetricatorON timer');
        console.timeEnd('demetricatorON timer');
        console.log('tstOFF');
    } 
    
    // else reveal all the previously demetricated metrics
    else {
        if(DBUG) console.time('demetricatorOFF timer');
        console.time('demetricatorOFF timer');

        // removing the style attr on the parents enables care-free automatic updating 
        // of the notification numbers.  
        j('#jewelContainer span.facebookmetricreqp').removeAttr('style');
        j('#jewelContainer span.facebookmetricmsgp').removeAttr('style');
        j('#jewelContainer span.facebookmetricnotp').removeAttr('style');

        // only if the notification counts are > 0 do we want them to fade in
        // otherwise, remove the style attribute alltogether so it doesn't interfere w/ FB's 
        // method for updating the count and showing the number when it wants to
        if(parseInt(j('#requestsCountValue').text())) j('.facebookmetricreq').fadeIn(FADE_SPEED);
        if(parseInt(j('#mercurymessagesCountValue').text())) j('.facebookmetricmsg').fadeIn(FADE_SPEED);
        if(parseInt(j('#notificationsCountValue').text())) j('.facebookmetricnot').fadeIn(FADE_SPEED);

        var notificationsTotal = 
            parseInt(j('#requestsCountValue').text()) +
            parseInt(j('#mercurymessagesCountValue').text()) +
            parseInt(j('#notificationsCountValue').text());

        if(notificationsTotal) {
            j('title').text('('+notificationsTotal+') '+currentTitleText);
        } else {
            j('title').text(currentTitleText);
        }

        // fade in all fadeClasses
        j.each(fadeClasses, function(index, value) { j(value).fadeIn(); });

        // show all selectors in hideShowClasses
        j.each(hideShowClasses, function(index, value) { j(value).show(); });

        // show all toggle classes in toggleOnOffClasses
        j.each(toggleOnOffClasses, function(index, value) { 
            j(value+'ON').hide();
            j(value+'OFF').show();
        });

        // chat button count -- need to keep it updated. even though i've
        // hidden the element that FB updates with that info, it's still
        // there so we can query it to get the latest whenever needed
        currentChatCount = j('.fbNubButton').find('.count').text();
        j('.chatnumber').text(currentChatCount).fadeIn(FADE_SPEED);

        // timeline ribbon dropdown is too much trouble to hide/show due to how
        // FB updates it after clicking, so I instead animate its color for fade in/out
        j('.fbTimelineMoreButton').find('.fbTimelineRibbon').find('.text').animate({color:RIBBON_TEXT_COLOR});

        // view all XX comments - restore them to my previously stored count in the oldvalue attribute
        j('.fbviewallcomments').each(function() { j(this).attr('value',j(this).attr('oldvalue')); });

        // tiny +1 icons
        j('.facebookmetric_hideshow_plusone_img').show();
        j('.facebookmetric_hideshow_plusone_text').css('padding-left','18px');

        // timeline add friend +1 icons
        j('#pagelet_friends span.FriendLink i').show();
        j('#pagelet_friends span.FriendLink a').css('padding-left','18px');

        // newsfeed attachment +1 icons
        j('.addButton i').not('.FriendRequestAdd').show();
        j('.addButton').not('.FriendRequestAdd').css('padding-left','18px');

        // a few metrics need to fade out while holding their space
        j.each(opacityClasses, function(index, value) { j(value).animate({opacity:1}, FADE_SPEED); });

        // event and timeline activity counts, need to make sure they aren't 0 before revealing
        j('.counter').each(function() {
            var cnt = parseInt(j(this).text());
            if(cnt) j(this).fadeIn(FADE_SPEED);
        });


        if(DBUG) console.timeEnd('demetricatorOFF timer');
        console.timeEnd('demetricatorOFF timer');
        console.log('tstOFF');

    }

    // for debugging, easily visualize whether the script sees dynamically 
    // inserted content by highlighting all links with red borders
    if(LINK_HIGHLIGHT_ON) {
        j('a').not('.facebooklink').addClass('facebooklink').css('border','1px solid red');
    } else {
        j('.facebooklink').css('border','0px solid red');
    }
}


// main():
//
// gets run on first load of userscript, sets up all future function calls
// (either by binding them to interface elements or dynamic element emergence)
//
// note that 'first load' is less often w/ FB than some sites. clicks on links
// w/in FB that appear to load new pages (and thus would typically reload the
// userscript) are not truly new page loads, just dynamic rewritings.  therefore
// we use other techniques to detect those apparent page changes for demetrication
//
function main() {

    // store away the URL we landed on
    startURL = window.location.href;

    // Firefox Addons don't allow excludes in the URL match, so we do it here.
    if(startURL.contains("ai.php") || startURL.contains("ajax")) return;
    
    // console reporting
    console.log("Facebook Demetricator v"+VERSION_NUMBER);
    console.log("    --> "+startURL);

    // setup jQuery on j to avoid any possible conflicts
    j = jQuery.noConflict();


    // store current chat count, then hide that count on the chat button
    var chatobj = j('.fbNubButton');
    currentChatCount = chatobj.find('.count').text();
    chatobj.find('.label').hide();
    chatobj.append(
        '<span class="chattext"> Chat <span class="chatnumber" style="display:none;">'+
        currentChatCount+'</span>'
    );

    // debugging checkbox
    if(DBUG) var dbugcb = '<input type="checkbox" name="testcb1"'+
        'style="margin-top:10px;margin-right:5px;" />';
    else var dbugcb = '';

    // the demetricator menu item and checkbox for the navbar
    var demetricatornavitem = 
        '<li style="float:left;padding:0;margin:0;border:0px solid red;"><input id="demetricatortoggle" type="checkbox" checked="checked" name="demetricatordb" style="margin-top:5px;margin-right:5px;line-height:29px;"><a style="line-height:29px;margin-top:0px;padding-right:10px;color:#d8dfea;font-weight:bold;" id="demetricatorlink">Demetricator</a></li><li class="navItem firstItem"><a style="margin-left:0px;margin-right:3px"></a></li>';

    // insert the navigation control
    j('#pageNav').prepend(demetricatornavitem);

    // Facebook Like Button for the Demetricator Project Homepage
    var likebutton = 
    '<iframe id="fbd_like_button" src="//www.facebook.com/plugins/like.php?href='+DEMETRICATOR_HOME_URL+'&amp;send=false&amp;layout=button_count&amp;width=90&amp;show_faces=false&amp;action=like&amp;colorscheme=light&amp;font&amp;height=21&amp;data-ref=FBD_TOGGLE_STATE_ON" scrolling="no" frameborder="0" style="border:none; overflow:hidden; width:90px; height:21px;margin:30px 0px 25px 0px;" allowTransparency="true"></iframe>';

    // HTML for the dialog box
    var dialoghtml = 
        '<div style="display:none; width: 330px; height: 230px; margin: 0px auto; border: 1px solid rgb(170, 170, 170); background-color: white;" class="" id="modaldialog">'+
        '<div style="margin:5px;" id="modalheader"> <label style="margin:5px;float:right;" class="simplemodal-close uiCloseButton"></label><br><br> </div> <center> <h1><a href="'+GROSSER_URL+'" target="_blank">Facebook Demetricator</a></h1> <span class="messageBody">Removes all the metrics from Facebook</span><br/>'
        +likebutton+
        '<h3><span class="fcg" style="font-weight:normal">by</span> Benjamin Grosser</h3> <span class="fsm fcg"><a href="http://bengrosser.com" target="_blank">bengrosser.com</a></span> </center> <div id="modalfooter" style="margin:15px;"> <p style="float:left;" class="fcg">version '+VERSION_NUMBER+'</p> <p style="float:right;" class="fcg"><a href="'+FAN_PAGE_URL+'" target="_blank">Fan page...</a></p> </div> </div>';

    // insert the dialog into the page
    j('body').append(dialoghtml);
    

    // setup demetrication of the like button to activate whenever the dialog is loaded
    j('#demetricatorlink').click(function() {
        if(demetricatorON) {
            var oldsrc = j('#fbd_like_button').attr('src');
            var newsrc = oldsrc.replace('FBD_TOGGLE_STATE_OFF','FBD_TOGGLE_STATE_ON');
            j('#fbd_like_button').attr('src',newsrc);
        } else {
            var oldsrc = j('#fbd_like_button').attr('src');
            var newsrc = oldsrc.replace('FBD_TOGGLE_STATE_ON','FBD_TOGGLE_STATE_OFF');
            j('#fbd_like_button').attr('src',newsrc);
        }

        j('#modaldialog').modal({
            opacity:50,
            overlayClose:true,
            overlayCss: {backgroundColor:"#000"}
        });
    });

    // bind toggleDemetricator() to the checkbox
    j('#demetricatortoggle').change(function() {
        if(j(this).is(':checked')) demetricatorON = true;
        else demetricatorON = false;
        toggleDemetricator();
    });

    // debugging checkbox
    j('input[name=testcb1]').change(function() {
        if(j(this).is(':checked')) LINK_HIGHLIGHT_ON = true;
        else LINK_HIGHLIGHT_ON = false;
        toggleDemetricator();
    });


    // facilitates demetrication of the like button in the Demetricator dialog box
    if(startURL.contains('FBD_TOGGLE_STATE_ON')) {
        //j('.connect_widget_button_count_count').text('');
        j('.pluginCountTextConnected').text('');
        j('.pluginCountTextDisconnected').text('');
    }

    if(KEY_CONTROL) j(document).bind('keydown','ctrl+f',function() { 
        demetricatorON = !demetricatorON;
        console.log('Demetricator = '+demetricatorON); 
        toggleDemetricator();
    });

    // remove the metrics from our landing page
    if(demetricatorON) demetricate(launchPolling);
}


// launchPolling()
//
// called via callback through demetricate(), used to launch a series 
// of persistent CSS element polls that watch for dynamically changed
// content in order to trigger various demetrications
//
function launchPolling() {

    // watch for new pages so we can recall demetricate as needed
    setInterval(checkForNewPage, ELEMENT_POLL_SPEED);

    // watch for all elements in keyElements, call newContentLoaded when found
    j.each(keyElements, function(index,value) {
        waitForKeyElements(value, newContentLoaded, false);
    });

    // Hovercards are dynamically generated, watch for them
    waitForKeyElements('.uiOverlayContent', demetricateHovercard, false);

    // friend list +1 icons within 'add friend' buttons
    waitForKeyElements('.fbProfileBrowserListItem', demetricateAddFriendButtons, false);

    // thumbs-up like counts on comments
    waitForKeyElements('.comment_like_button', demetricateCommentLikeButton, false);

    // browser 'title' tag (e.g. tab title or window title, gets a notification metric: '(2) Facebook')
    setInterval(function() { 
        if(demetricatorON) demetricateTitle();
    }, 1000);

    // likes get updated dynamically
    waitForKeyElements('.uiUfiLike', demetricateLikesThis, false);

    // search result items
    waitForKeyElements('ul.search li', demetricateSearchResultEntries, false);

    // comments get updated dynamically
    waitForKeyElements('.uiUfiComment', function() {
        demetricateTimestamps();
        demetricateCommentLikeButton();
    }, false);

    // chat list (e.g. 'MORE ONLINE FRIENDS (8)')
    waitForKeyElements('.moreOnlineFriends', function() { 
        setTimeout(function() { demetricateChatSeparator(); }, 50);
    }, false);
    
    // /find-friends blocks
    waitForKeyElements('.friendBrowserListUnit',demetricateFriendBrowserBlocks, false);

    // search result block items
    waitForKeyElements('.detailedsearch_result',demetricateSearchResult, false);

    // subscriber counts
    waitForKeyElements('.followListItem',demetricateFollowListItem, false);

    //waitForKeyElements('#ariaPoliteAlert',demetricateAriaAlert, false);
}

// demetricateTitle() 
// called by launchPolling() and demetricate()
// removes the parenthetic prefix on the 'title' tag
// stores the rest of the title for later restoration
function demetricateTitle() {
    var currentTitle = j('title');
    var txt = currentTitle.text();
    var parsed = txt.match(/^(\(\d+(?:,\d+)*\))\s(.*)/);
    if(parsed) { 
        currentTitle.text(parsed[2]);
        if(currentTitleText != undefined) currentTitleText = parsed[2];
        else currentTitleText = 'Facebook';
    }
}

// demetricate() tags and then hides all metrics from the facebook interface
// the tags are used are by toggleDemetricator() to show/hide them as requested
function demetricate(callback) {

    if(DBUG) console.time('demetricator timer');

    // -----------------------
    // -- BROWSER/TAB TITLE --
    // -----------------------
    demetricateTitle();


    // --------------------------------------------------------
    // -- SIDEBAR COUNTS (TIMELINE, OLD-STYLE PROFILE, ETC.) --
    // --------------------------------------------------------
    //
    // a few facebook metrics are already marked by Facebook with .count. 
    // wrap some items and tag them all
    var countclass = j('.count');

    if(countclass.length) {
        countclass.not('.facebookcount').each(function() {

            j(this).addClass('facebookcount');

            // uiSideNavCount is for newsfeed left sidebar counts (events, groups, etc)
            // uiSideNavCountText is for old-style profile counts, such as Photos, Friends, etc.)
            // both are easy, so just mark them
            if(j(this).hasClass('uiSideNavCount') || j(this).hasClass('uiSideNavCountText')) {
                j(this).addClass('facebookmetric_fade').css('display','none');
            } 
            
            // otherwise the count needs to be wrapped for trouble-free jQuery fading
            else {
                var n = j(this).text();;
                j(this).html('<div style="display:none;" class="facebookmetric_fade">'+n+'</div>');
            }

        });
    }


    // -----------------------------------------------------------------------
    // -- NAVBAR RED/WHITE NOTIFICATION ICONS, NOTIFICATION DROP-DOWN MENUS --
    // -----------------------------------------------------------------------
    // 
    // these catch the red/white notification icons in the top menu.  they each get their own
    // class so I can individually query them later to make sure they're not 0 before revealing them
    j('#fbRequestsJewel').find('.jewelCount').not('.facebookmetricreqp').addClass('facebookmetricreqp').hide();
    j('#fbMessagesJewel').find('.jewelCount').not('.facebookmetricmsgp').addClass('facebookmetricmsgp').hide();
    j('#fbNotificationsJewel').find('.jewelCount').not('.facebookmetricnotp').addClass('facebookmetricnotp').hide();
    
    j('#requestsCountValue').not('.facebookmetricnot').addClass('facebookmetricnot').hide();
    j('#mercurymessagesCountValue').not('.facebookmetricnot').addClass('facebookmetricnot').hide();
    j('#notificationsCountValue').not('.facebookmetricnot').addClass('facebookmetricnot').hide();

    // small link counts, such as '10 mutual friends' in the friend requests drop-down
    j('#fbRequestsList a.uiLinkSubtle').not('.facebookcount').each(function() {
        wrapNumberInString(this);
    });


    // -------------------------
    // ------- CHAT LIST -------
    // -------------------------
    demetricateChatSeparator();


    // -------------------------------
    // ------- TIMELINE RIBBON -------
    // -------------------------------
    
    // the small drop-down on the right-hand side of the timeline ribbon that expands 
    // the icons to show the rest of the items (e.g. friends, likes, photos, etc.).  this one
    // can't just be hidden due to the way FB rewrites the button code after the click, so I 
    // instead animate it's color to white for hiding (and back to original color for showing)
    j('.fbTimelineMoreButton').find('.fbTimelineRibbon').find('.text').animate({color:"#fff"}, FADE_SPEED);

    // timeline mutual friends count (on timeline profiles other than your own)
    j('#pagelet_timeline_friends_nav_top').find('.fbTimelineRibbon').find('.text').
        not('.fbribboncounts').each(function() {
            j(this).addClass('fbribboncounts');
            var txt = j(this).text();

            if(txt.contains('Mutual')) {

                // wrap the mutual number
                var parsed = txt.match(/^(\d+(?:,\d+)*)\s+(.*)/);

                if(parsed) {
                    j(this).html('<span class="facebookmetric_hideshow" style="display:none;">'+
                        parsed[1]+'</span> '+parsed[2]);
                }
            }

    });



    // ----------------------------------
    // -- TIMELINE STORY BLOCK REPORTS --
    // ----------------------------------

    // timeline block reports (joined 2 events, 8 friends, with 50 other guests, visited 2 places, etc.)
    var tlreportcontentclass = j('.timelineReportContent');

    // if there are any at all, deal with them
    if(tlreportcontentclass.length) {

        // timeline block reports, friend counts, event counts (e.g. 'Joined 2 Events' or '8 Friends')
        tlreportcontentclass.find('.aboveUnitContent').find('a[rel="dialog"]').
            not('.fbtimelinecount').each(function() {
                j(this).addClass('fbtimelinecount');

                var txt = j(this).text();
                if(txt.contains('Friend') || txt.contains('Event') || txt.contains('Group')) {

                    // wrap the count
                    var parsed = txt.match(/^(\d+(?:,\d+)*)\s+(.*)/);

                    if(parsed) {
                        j(this).html('<span class="facebookmetric_hideshow" style="display:none;">'+
                            parsed[1]+'</span> '+parsed[2]);
                    }
                }
        });


        // timeline visited block reports, individual attended items, such as 'With 50 other guests'
        tlreportcontentclass.find('.uiList').find('a[rel="dialog"]').
             not('.fbtimelinecount').each(function() {
                 j(this).addClass('fbtimelinecount');

                 var txt = j(this).text();
                 if(txt.contains('other guest')) {

                     // wrap the count
                     var parsed = txt.match(/^(\d+)\s+(.*)/);

                     if(parsed) {
                         j(this).html('<span class="facebookmetric_hideshow" style="display:none;">'+
                             parsed[1]+'</span> '+parsed[2]);
                     }
                 }
        });


        // timeline block report (Activity - July - People Who Like This - 116)
        tlreportcontentclass.find('.bigNumber').not('.fbtimelinecount').each(function() {
                 j(this).addClass('fbtimelinecount fbtimelineblockcount');
                 j(this).css('opacity',0);
        });


        // timeline visited reports such as 'Visited 2 Places'
        tlreportcontentclass.find('.aboveUnitContent').not('.fbtimelinecount').each(function() {

             j(this).addClass('fbtimelinecount');

             var txt = j(this).text();

             // 'Visited 2 Places'
             if(txt.contains('Visited')) { 

                 // wrap the count
                 var parsed = txt.match(/(.*)\s+(\d+(?:,\d+)*)\s+(.*)/);

                 if(parsed) {
                     j(this).html(parsed[1]+' <span class="facebookmetric_hideshow" style="display:none;">'+
                         parsed[2]+'</span> '+parsed[3]);
                 }
             } 
             
             // '65 friends posted on Someone's timeline.'
             else if(txt.contains('posted')) {

                 var parsed = txt.match(/^(\d+(?:,\d+)*)\s+(.*)/);

                 if(parsed) {
                     j(this).html('<span class="facebookmetric_hideshow" style="display:none;">'+
                         parsed[1]+'</span> '+parsed[2]);
                 }

             }

             // '10 Recent Places'
             else if(txt.contains('Place')) {

                 var parsed = txt.match(/^(\d+(?:,\d+)*)\s+(.*)/);

                 if(parsed) {
                     j(this).html('<span class="facebookmetric_hideshow" style="display:none;">'+
                         parsed[1]+'</span> '+parsed[2]);
                 }

             }

            // 'Tagged in 2 photos'
            else if(txt.contains('Tagged')) {
                var link = j(this).find('a[rel="theater"]'); 
                wrapNumberInString(link);
            }

        });

    }


    // Places timeline report counts, hides the places count in the overlay sentence, such as:
    // 'Ben Grosser was at Somewhere and 2 other places.'  Handles singular/plural
    j('.fbTimelineAggregatedMapUnitCallout div.fcg').not('.fbtimelinecount').each(function() {
            j(this).addClass('fbtimelinecount');
            var txt = j(this).text();

            if(txt.contains('place') && txt.match(/\d/)) {

                // wrap the place visit number
                var parsed = txt.match(/(.*)\s+(\d)\s(other place.*)/);

                if(parsed) {
                    j(this).html(parsed[1]+'<span class="facebookmetric_hideshow" style="display:none;"> '+
                        parsed[2]+'</span> '+parsed[3]); 
                }
            }
    });


    // timeline block subtitles sometimes contain metrics (such as the Friends block)
    // should probably target this more directly
    j('.date.fwn.fcg').each(function() { 
        var s = j(this).text(); 
        if(s.match(/\d/) && (s.match(/Friends/) || s.match(/Likes/) || s.match(/Photos/) || s.match(/Places/)) ) {
            //j(this).parent().html(
            j(this).removeClass('date fwn fcg').addClass('facebookmetric_fade').css('display','none').text(s);
        }
    });


    // timeline report blocks report friends in other ways as well, such as with mutual friends, places visited, etc.
    j('.timelineReportCol').find('div.date.fwn.fcg a').not('.mutualfriendcount').each(function() {
        j(this).addClass('mutualfriendcount');
        var txt = j(this).text();
        if(txt.contains('Mutual')) {
            var parsed = txt.match(/^(\d+(?:,\d+)*)\s+(.*)/);
            if(parsed) {
                j(this).html('<span class="facebookmetric_fade" style="display:none;">'+
                    parsed[1]+'</span> '+parsed[2]);
            }
        }
    });


    // timeline like blocks (e.g. 1 Friend Likes Kellie Dog Jpg)
    j('.headerDigit span').not('fbtimelineblockcounts').each(function() {
        j(this).addClass('fbtimelineblockcounts facebookmetric_hideshow');
        j(this).hide();
    });


    // inside timeline like blocks, friend counts about others who like/listen/etc. the thing (7 friends like this)
    j('.fbPageFriendSummarySection a[rel="dialog"]').not('.fbtimelineblocklikecount').each(function() {
        j(this).addClass('fbtimelineblocklikecount');
        var txt = j(this).text();
        if(txt) {
            var parsed = txt.match(/(\d+(?:,\d+)*)\s(.*)/);
            if(parsed) {
                j(this).html(
                    '<span class="facebookmetric_hideshow" style="display:none;">'+parsed[1]+' </span>'+
                    parsed[2]
                );
            }
        }
    });
        

    // Page post metrics, such as '19 people saw this post' .. only viewable to group admins (?)
    j('.insightsBar a').not('.fbtimelineinsight').each(function() {
        j(this).addClass('fbtimelineinsight');
        wrapNumberInString(this);
    });


    // timeline activity block new friends counts ('Dan is friends with John Doe and 6 other people')
    j('.storyText a[rel="dialog"]').not('fbtimelineblockcounts').each(function() {
        j(this).addClass('fbtimelineblockcounts');
        wrapNumberInString(this);
    });


    // like lists on timeline blocks ('18 friends also like this')
    j('#liked_pages_timeline_unit_list .uiListItem a[rel="dialog"]').not('fbtimelineblockcounts').each(function() {
        j(this).addClass('fbtimelineblockcounts');
        wrapNumberInString(this);
    });


    // timeline entry feedback blocks: comment counts
    j('.fbTimelineFeedbackCommentLoader').not('.fbtimelineblockcounts').each(function() {

        j(this).addClass('fbtimelineblockcounts');

        tagAndStyleMetric(
            j(this),
            /^(<i><\/i>)(\d+(?:,\d+)*)/,
            'fbtimelineblockcount',
            2,
            'opacity:0;'
        );

        /*
        var html = j(this).html();
        if(html) {
            var parsed = html.match(/^(<i><\/i>)(\d+(?:,\d+)*)/);
            if(parsed) {
                j(this).html(parsed[1]+'<span class="fbtimelineblockcount" style="opacity:0;">'+
                    parsed[2]+'</span>');
            }
        }
        */
    });
    

    // timeline entry share counts
    j('.fbTimelineFeedbackShares a').not('.fbtimelineblockcounts').each(function() {
        j(this).addClass('fbtimelineblockcounts');
        var html = j(this).html();
        if(html) {
            var parsed = html.match(/^(<i><\/i>)(\d+(?:,\d+)*)/);
            if(parsed) {
                j(this).html(parsed[1]+'<span class="fbtimelineblockcount" style="opacity:0;">'+
                    parsed[2]+'</span>');
            }
        }
    });

    
    // timeline subscribers counts (in the ribbon)
    j('#pagelet_timeline_subscribers_nav_top').find('table.statsContainer span.fwb').
        not('.fbribbonstat').each(function() {
            j(this).addClass('fbribbonstat').addClass('facebookmetric_fade').hide();
    });


    // timeline like counts (in the ribbon)
    j('#pagelet_timeline_likes_nav_top').find('table.statsContainer span.fwb').
        not('.fbribbonstat').each(function() {
            j(this).addClass('fbribbonstat').addClass('facebookmetric_fade').hide();
    });


    // business/org page timeline headline stats ('243 likes . 10 talking about this . 711 were here')
    // could just remove numbers from this, but it leaves nothing of use so taking the easy way out
    // at least for now
    j('#fbTimelineHeadline h2').find('div.fsm.fwn.fcg').not('.fbheadlinestat').each(function() {
        j(this).addClass('fbheadlinestat');
        var txt = j(this).text();
        //if(txt.contains('likes') && txt.contains('talking about')) 
        if(txt.contains('likes')) 
            j(this).addClass('fbribbonstat').addClass('fbTimelineHeadlineStats').css('opacity','0');
    });


    // timeline-type personal friends list count
    j('#pagelet_friends h3 span:first').not('.fbtimelinefcwrapper').each(function() {
        j(this).addClass('fbtimelinefcwrapper');
        j(this).html(
            '<span style="display:none;" class="facebookmetric_fade">'+j(this).html()+'</span>'
        );
    });


    // timeline-type mutual friends list counts, photo counts on albums pages, etc.
    j('.fbTimelineSection h3:first').not('.fbmutualfriends').
        addClass('fbmutualfriends').each(function() {
            var txt = j(this).html();
            // if this is an album, deal with the ' . Videos' trailer on the header
            if(txt.contains('Videos')) {
                // works for the photos page that also lists metrics for videos
                var parsed = txt.match(/(.*)(\(\d+(?:,\d+)*\))(.*)(\(\d+(?:,\d+)*\))(.*)/);
                if(parsed) {
                    j(this).html(
                        parsed[1]+' <span class="facebookmetric_fade" style="display:none;">'+
                        parsed[2]+'</span>'+
                        parsed[3]+' <span class="facebookmetric_fade" style="display:none;">'+
                        parsed[4]+
                        parsed[5]
                    );
                }

                // works for video list page (e.g. 'Your Videos (1) . Albums')
                else {
                    parsed = txt.match(/(.*)(\(\d+(?:,\d+)*\))(.*)/);
                    if(parsed) {
                        j(this).html(
                            parsed[1]+' <span class="facebookmetric_fade" style="display:none;">'+
                            parsed[2]+'</span>'+parsed[3]
                        );
                    }
                }

                /*
                var parsed = txt.match(/(.*)(\(\d+(?:,\d+)*\))(.*)/);
                if(parsed) {
                    j(this).html(
                        parsed[1]+' <span class="facebookmetric_fade" style="display:none;">'+
                        parsed[2]+'</span>'+parsed[3]
                    );
                }
                */


            }
            // else it's easier
            else if(txt) {
                var parsed = txt.match(/(.*)(\(\d+(?:,\d+)*\))/);
                if(parsed) {
                    j(this).html(
                        parsed[1]+' <span class="facebookmetric_fade" style="display:none;">'+
                        parsed[2]+'</span>'
                    );
                }
            }
            return false;
    });


    // timeline subscriptions page
    demetricateFollowListItem(j('.followListItem'));


    // subscribers header counts
    j('.followListFilter .lfloat span').not('.fbfollowitem').each(function() {
        j(this).addClass('fbfollowitem');
        wrapNumberInString(this);
    });

    
    // timeline add friend +1 icons
    j('#pagelet_friends span.FriendLink i').hide();
    j('#pagelet_friends span.FriendLink a').css('padding-left','0px');


    // timeline unit headlines, such as Soandso suchandsuch (55 photos)
    j('.aboveUnitContent span.fcg').not('.fbtimelinephotocount').each(function() {
        j(this).addClass('fbtimelinephotocount');
        var txt = j(this).text();
        if(txt) {
            var parsed = txt.match(/^(\()(\d+(?:,\d+)*)(.*)(\))/);
            if(parsed) {
                j(this).html(parsed[1]+'<span class="facebookmetric_hideshow" style="display:none;">'+parsed[2]+
                    ' </span>'+parsed[3].replace(/\s/,'')+parsed[4]);
            }
        }

        // yet another way of listing photo counts in timeline boxes
        var nextitem = j(this).find('a[data-hover="tooltip"]');

        if(nextitem) {
            var nexttxt = nextitem.text();
            if(nexttxt.contains('other')) {
                var nextparsed = nexttxt.match(/(\d+(?:,\d+)*)(.*)/);
                if(nextparsed) {
                    nextitem.html('<span class="facebookmetric_hideshow" style="display:none;">'+
                        nextparsed[1]+' </span>'+nextparsed[2]);
                }
            }
        }

    });

     
    // stylized +N icons that fit within a group of friend tinyman photos
    // such as '+3' to indicate there are more friends than can fit in the
    // timeline box we're looking at.  
    j('.fbTimelineBoxCount').not('.boxcount').each(function() {
        j(this).addClass('boxcount');
        var txt = j(this).text();
        j(this).html('<span class="facebookmetric_hideshow" style="display:none;">'+txt+'</span>');
    });


    // album page individual albums photo counts (facebook.com/username/photos)
    j('.photoText .fsm.fwn.fcg').not('.facebookcount').addClass('facebookcount').css('opacity','0');


    // timeline birthday report counts
    j('.fbTimelineUnitActor.aboveUnitContent h6.unitHeader').not('.facebookcount').each(function() {
        wrapNumberInString(this);
    });


    // ---------------------------------------
    // -- GLOBAL METRICS (OCCUR EVERYWHERE) --
    // ---------------------------------------

    // convert all timestamps (e.g. '2 seconds ago') to either 'recently' or 'a while ago'
    demetricateTimestamps();


    // 'See More (3)' pager controls, occur in multiple views (news feed, photo albums, etc.)
    j('a.uiMorePagerPrimary').not('.fbtimelinecount').each(function() {
            j(this).addClass('fbtimelinecount');
            var txt = j(this).text();

            if(txt.match(/^\d/) && txt.contains('more')) {

                // wrap the place visit number
                var parsed = txt.match(/^(\d+(?:,\d+)*)\s+(.*)/);

                if(parsed) {
                    j(this).html('<span class="facebookmetric_hideshow" style="display:none;"> '+
                        parsed[1]+'</span> '+parsed[2]); 
                }
            }

            else if(txt.contains('See More')) {
                // wrap the place visit number
                var parsed2 = txt.match(/^(See More)\s+(\(\d+(?:,\d+)*\))/);

                if(parsed2) {
                    j(this).html(parsed2[1]+' <span class="facebookmetric_hideshow" style="display:none;"> '+
                        parsed2[2]+'</span>'); 
                }
            }
    });

    
    // comment like buttons, also called via waitForKeyElements
    demetricateCommentLikeButton();


    // view all XX comments in the comment block (link to load all comments)
    j('input[name="view_all[1]"]').not('.fbviewallcomments').each(function() { 
        var origval = j(this).attr('value');
        j(this).attr('oldvalue',j(this).attr('value'));
        j(this).attr('newvalue','View all comments');
        j(this).addClass('fbviewallcomments').attr('value',j(this).attr('newvalue'));
    });


    // +1 parts of '+1 Respond to Friend Request' buttons
    j('.FriendRequestIncoming i, .FriendRequestOutgoing i').hide();



    // --------------------------------
    // ------- NEWSFEED METRICS -------
    // --------------------------------

    // comment like buttons, also called via waitForKeyElements
    demetricateLikesThis();


    // share counts in the news feed, a bit tricky
    j('.uiUfiViewSharesLink').not('.fbsharecount').each(function() {

        // grab the innerHTML of the <a> tag, which should contain an <i>
        // tag followed by the '# shares' text.  clean up the extractedj
        // code to remove newlines, then parse it into three parts: 
        // the <i> tag, the #, and the 'share(s)' text
        var newinner = '';
        var linkhtml = (j(this).html()).replace(/\n/g, '');
        var parsed = linkhtml.match(/(.*i>)(\d+(?:,\d+)*)\s+(.*)/);

        // presuming we got something, reconstruct a new inner without 
        // the number in it
        if(parsed) newinner = parsed[1] + " " + parsed[3];

        // create the new link to match the original, but with the # removed
        var newlink = j('<a>');
        newlink.addClass('uiUfiViewSharesLink uiIconText fbsharecount facebookmetric_toggleON');
        newlink.attr('rel','async').attr('href',j(this).attr('href'));
        newlink.attr('ajaxify',j(this).attr('ajaxify'));
        newlink.html(newinner);

        // insert the new link, add classes to and hide the original
        j(this).before(newlink);
        j(this).addClass('fbsharecount facebookmetric_toggleOFF').css('display','none');

    });

    // large comment block counts (e.g. '50 of 152')
    j('.ufiCommentCount').not('.fbsharecount').addClass('fbsharecount').addClass('facebookmetric_hideshow').hide();


    // some newsfeed items, perhaps only those that aren't from a close friend (e.g. friend of
    // friend, or from a liked page/business, etc...) include abbreviated bars of info for
    // likes, shares, and comments.  this should remove all those counts
    j('.uiBlingBox .text').not('.facebookmetric_fade').addClass('facebookmetric_fade').css('display','none');


    // +1 icons
    j('.facebookmetric_hideshow_plusone_img').hide();
    j('.facebookmetric_hideshow_plusone_text').css('padding-left','0px');


    // ad like counts
    // #pagelet_ego_pane span.fbEmuContext
    j('.fbEmuContext').not('.facebookcount').each(function() {
        wrapNumberInString(this);
    });


    // ad 'claimed' counts (e.g. as in some kind of 'offer').  comes with a preceeding bullet, such as
    // ' · 155,387 claimed' ... i've seen it structured in other ways previously but can't find it now
    // may still need to add some code to this one later
    j('.couponAdsLink').next().not('.fbclaimedcount').each(function() {
        j(this).addClass('fbclaimedcount');

        // returns only the text element of a container that also has other wrapped elements
        // used by the demetrication routine for /name/favorites to remove people like this counts
        j.fn.justtext = function() { return j(this).clone() .children() .remove() .end() .text(); };

        var children = j(this).children();
        var txt = j(this).justtext();
        if(txt.contains('claimed')) {
            //var parsed = txt.match(/^(\s·\s)(\d+(?:,\d+)*)\s+(.*)/);
            var parsed = txt.match(/^(.*)\s+(\d+(?:,\d+)*)\s+(.*)/);
            var newtxt = 
                parsed[1]+ '<span style="display:none;" class="facebookmetric_hideshow"> '+
                parsed[2]+'</span> '+
                parsed[3];
            j(this).html(children).append(newtxt);
        }
    });


    // trending articles block counts (range: '1 of 3')
    // TODO preceeding bullet ' . ' should go too
    j('.ogAggregationHeaderTitleContainer').find('.rangeText').not('.facebookcount').
        addClass('facebookcount facebookmetric_fade').hide();


    // trending articles '### people read this'
    j('.ogSingleStoryStatus').find('.rfloat').find('span.fcg').not('.facebookcount').each(function() {
        wrapNumberInString(this);
    });


    // birthday extras (e.g. John Doe and 3 others)
    j('.fbRemindersTitle').not('.facebookcount').each(function() {
        j(this).addClass('facebookcount');

        var txt = j(this).text();

        // sometimes fbRemindersTitle isn't an 'others' count
        if(txt.contains('other')) {
            var parsed = txt.match(/^(\d+(?:,\d+)*)\s+(.*)/);
            if(parsed) {
                j(this).html(
                    '<span style="display:none;" class="facebookmetric_hideshow">'+parsed[1]+'</span> '+parsed[2]);
            }
        }
        
    });


    // all counts in the reminders box on the right-hand side of the newsfeed (e.g. '4 events today')
    j('.fbRemindersTitle').find('strong').not('.facebookcount').each(function() {
        wrapNumberInString(this);
    });


    // small link counts, such as '10 mutual friends' in the 'People You May Know' box
    j('.home_right_column a.uiLinkSubtle').not('.facebookcount').each(function() {
        wrapNumberInString(this);
    });


    // +1 add button on newsfeed attachment items
    j('.addButton i').not('.FriendRequestAdd').hide();
    j('.addButton').not('.FriendRequestAdd').css('padding-left','0px');


    // news feed headlines that count up tagged members, such as 
    // 'John Doe posted a video -- with Joe Blow and 10 others'
    // TODO: needs some cleanup...we don't need to alter the HTML here, just the inline text
    // might need a new function to handle that job, but this is giving hte right visual for hte moment
    j('.uiStreamMessage').find('a[data-hover="tooltip"]').not('.facebookcount').each(function() {
        wrapNumberInString(this);
    });


    var egoprofiletemplate = j('.egoProfileTemplate');

        // 'Recommended Pages' mutual friend counts
        // and +1 icons on recommended friend boxes (a little tricky)
        egoprofiletemplate.find('a').not('.fbmutualfriends').addClass('fbmutualfriends').each(function() { 
            var txt = j(this).text(); 
            if(txt.contains('mutual friend') || txt.contains('other friend')) {
                var parsed = txt.match(/^(\d+(?:,\d+)*)\s+(.*)/);
                //var newhtml = '<span class="facebookmetric_hideshow" style="display:none;">'+
                var newhtml = '<span class="facebookmetric_hideshow" style="display:none;">'+
                    parsed[1]+'</span> '+parsed[2];  
                j(this).html(newhtml);

            }

            // handles the +1 icons next to 'Add Friend' text on recommended frirend list
            if(txt.contains('Add Friend')) {
                j(this).addClass('facebookmetric_hideshow_plusone_text').css('padding-left','0px');
                j(this).find('i').addClass('facebookmetric_hideshow_plusone_img').hide();
            }
        });

        // some Page like counts, such as '9,234,721 people like this.' under Chocolate Chip Cookies
        egoprofiletemplate.find('div:not(.ego_action)').not('.fblikethis').each(function() {
            j(this).addClass('fblikethis');
            var txt = j(this).text();
            if(txt.contains('like this') || txt.contains('people play')) {
                var parsed = txt.match(/^(\d+(?:,\d+)*)\s+(.*)/);
                if(parsed) {
                    var newhtml = '<span class="facebookmetric_hideshow" style="display:none;">'+
                        parsed[1]+'</span> '+parsed[2];  
                    j(this).html(newhtml);
                }
            }
        });


    // friend finder counts (e.g. 'These 3 friends found their friends using...')
    j('div.ego_contact_importer div.mvs').not('.facebookcount').each(function() {
        wrapNumberInString(this);
    });


    // shared item single-page views (e.g. ' · 157 like this')
    j('.subscribeOrLikeSentence span').not('.fbsingleitemsharecount').
        addClass('fbsingleitemsharecount').each(function() {
            var txt = j(this).text();
            if(txt.contains('like this')) {
                var parsed = txt.match(/^(.*\s)(\d+(?:,\d+)*)\s+(.*)/);
                if(parsed) {
                    var newhtml = parsed[1] + 
                        '<span class="facebookmetric_toggleOFF" style="display:none;">'+parsed[2]+'</span> '+
                        '<span class="facebookmetric_toggleON">people</span> '+
                        parsed[3];  
                    j(this).html(newhtml);
                }
            }
    });


    // comment-posted URL attachment like counts
    j('.uiAttachmentDetails').not('.fblikethiscount').
        addClass('fblikethiscount').each(function() {
        var txt = j(this).text();

        if(txt.contains('like this')) {
                var newhtml = 
                    '<span class="facebookmetric_toggleOFF" style="display:none;">'+txt+'</span> '+
                    '<span class="facebookmetric_toggleON">people like this</span> ';
                j(this).html(newhtml);
        }
    });


    // newsfeed story headlines that contains photos added counts (e.g. 'soandso added 8 new photos.')
    j('.uiStreamStory h6').not('.fbstreamheadline').each(function() {
        j(this).addClass('fbstreamheadline');
        var txt = j(this).text();
        if(txt.contains('new photo')) {
            //var parsed = txt.match(/^(.*)\s+(\d+(?:,\d+)*)(.*)/);
            var parsed = txt.match(/^(.*added\s+)(\d+(?:,\d+)*)\s+(new.*)/);
            if(parsed) {
                j(this).html(parsed[1]+'<span class="facebookmetric_hideshow" style="display:none;"> '+parsed[2]+
                    ' </span>'+parsed[3]);
            }
        } 
        
        // a different way of listing the # of photos in a stream story headline (oh fun)
        // a less logical structure than other ways they do it
        var nextitem = j(this).find('span.fcg');

        if(nextitem) {
            var nexthtml = nextitem.html();
            if(nexthtml) {
                if(nexthtml.contains('photos)')) {
                    var parsed2 = nexthtml.match(/^(.*)(\s+\()(\d+(?:,\d+)*)\s+(.*)/);
                    if(parsed2) {
                        nextitem.html(parsed2[1]+parsed2[2]+
                            '<span class="facebookmetric_hideshow" style="display:none;">'+
                            parsed2[3]+
                            ' </span>'+parsed2[4]
                        );
                    }
                }
            }
        }
    });


    // newsfeed attachment like counts (e.g. 'Someone and 17 others like this')
    j('.uiAttachmentDesc a[data-hover="tooltip"]').not('.facebookcount').each(function() {
        j(this).addClass('facebookcount');
        var txt = j(this).text();
        var parsed = txt.match(/^(\d+(?:,\d+)*)\s+(.*)/);
        if(parsed) {
            j(this).html(
                '<span style="display:none;" class="facebookmetric_hideshow">'+parsed[1]+'</span> '+parsed[2]);
        }
    });


    // facebook questions stats
    j('.fbQuestionsBlingBox span.fsm').not('.facebookcount').each(function() {
        j(this).addClass('facebookcount facebookmetric_hideshow').hide();
    });



    // ----------------------------------
    // ------- GROUP PAGE METRICS -------
    // ----------------------------------
   
    // group member counts (when you aren't a member)
    j('.groupsJumpInfoArea div.fsm.fwn.fcg').not('.facebookcount').each(function() {
        wrapNumberInString(this);
    });

    
    // group filter/search button
    j('.groupMemberActionBar .uiSelectorButton span.uiButtonText').not('.facebookcount').each(function() {
        j(this).addClass('facebookcount');
        var txt = j(this).text();
        var parsed = txt.match(/^(.*)\s+(\(\d+(?:,\d+)*\))/);
        if(parsed) { 
            j(this).html(
                parsed[1]+
                '<span class="facebookmetric_hideshow" style="display:none;"> '+parsed[2]+'</span>'
            );
        }
    });


    j('.groupMemberActionBar .uiSelectorMenuWrapper span.itemLabel').not('.facebookcount').each(function() {
        j(this).addClass('facebookcount');
        var txt = j(this).text();
        var parsed = txt.match(/^(.*)\s+(\(\d+(?:,\d+)*\))/);
        if(parsed) { 
            j(this).html(
                parsed[1]+
                '<span class="facebookmetric_hideshow" style="display:none;"> '+parsed[2]+'</span>'
            );
        }
    });


    // group feed member counts ('someone and 11 other people are in this group')
    j('#pagelet_group_pager .groupsStreamMemberBoxNames a[data-hover="tooltip"]').not('.facebookcount').each(function() {
        wrapNumberInString(this);
    });


    var fbgroupsidebox = j('.groupsAddMemberSideBox');

        // group member counts top-right ('9 members')
        fbgroupsidebox.find('a.uiLinkSubtle').not('.facebookcount').each(function() {
            wrapNumberInString(this);
        });

        // group new member counts '(1 new)'
        fbgroupsidebox.find('a.mls').find('span.fwb').not('.facebookcount').each(function() {
            j(this).addClass('facebookcount');
            var txt = j(this).text();
            if(txt) {
                var parsed = txt.match(/^(\()(\d+(?:,\d+)*)\s+(.*\))/);
                if(parsed) {
                    j(this).html(parsed[1]+
                        '<span class="facebookmetric_hideshow" style="display:none;">'+
                        parsed[2]+
                        ' </span>'+parsed[3]
                    );
                }
            }
        });



    // MESSAGES page
    
    // some mutual friends counts on the messages page
    // needs a bump or two after due to a FB recheck
    demetricateMessageMutualFriends();
    setTimeout(demetricateMessageMutualFriends, 1000);
    setTimeout(demetricateMessageMutualFriends, 2000);

    // thread counts on messages (e.g. gmail-like number of messages in thread count)
    j('.unreadCount').not('.facebookcount').addClass('facebookcount facebookmetric_hideshow').hide();



    // SEARCH RESULTS page
    demetricateSearchResult(j('.detailedsearch_result'));



    // APP CENTER pages

    // app block user counts. erasing the number doesn't leave anything of use, unless there's also some personal friend
    // counts.  for the moment, remove the line, but should come back and be more selective
    j('.appsListItem .appCategories div.fcg').not('.facebookcount').
        addClass('facebookcount facebookmetric_opacity').css('opacity',0);

    // side navigation counts
    j('.sideNavItem .count').not('.facebookcount').addClass('facebookcount facebookmetric_fade').hide();



    // MUSIC page
    // I'm not going to catch everything here, as each new music service has its own new
    // way of showing metrics and i dont' want to keep up, but i will manage typical FB
    // presentations of metrics here (such as song list pager links)
    j('.songListPager').not('.facebookcount').each(function() {
        j(this).addClass('facebookcount');
        var txt = j(this).html();
        if(txt) {
            var parsed = txt.match(/^(.*)\s+(\d+(?:,\d+)*)\s+(.*)/);
            if(parsed) {
                j(this).html(
                    parsed[1]+' <span class="facebookmetric_fade" style="display:none;">'+
                    parsed[2]+'</span> '+
                    parsed[3]
                );
            }
        }
    });


    // music service pitch boxes for spotify and earbits
    j('#music_services li').find('span.fcg').not('.facebookcount').each(function() {
        j(this).addClass('facebookcount');
        var txt = j(this).text();
        if(txt.contains('Earbits')) wrapNumberInString(this);
        else if(txt.contains('Spotify')) {
            var parsed = txt.match(/^(.*)\s+(\d+(?:,\d+)*)\s+(.*)/);
            if(parsed) {
                j(this).html(
                    parsed[1]+' <span class="facebookmetric_fade" style="display:none;">'+
                    parsed[2]+'</span> '+
                    parsed[3]
                );
            }
        }
    });



    // EVENTS page

    // red/white number in the 'invites' button on the Calendar tab
    //j('.counter').not('.facebookcount').addClass('facebookcount facebookmetric_fade').hide();
    j('.counter').hide();


    // parenthetic invite count on list
    j('.fbCalendarBoxHeader').not('.facebookcount').each(function() {
        j(this).addClass('facebookcount');
        var txt = j(this).html();
        if(txt) {
            var parsed = txt.match(/(.*)(\(\d+(?:,\d+)*\))/);
            if(parsed) {
                j(this).html(
                    parsed[1]+' <span class="facebookmetric_fade" style="display:none;">'+
                    parsed[2]+'</span>'
                );
            }
        }
        return false;
    });

    // event blocks on list ('2 friends invited you')
    j('fbCalendarInviteContent a[rel="dialog"]').not('.facebookcount').each(function() {
        wrapNumberInString(this);
    });

    // event block guest counts (e.g. 'Soandso and 2 other friends are guests')
    j('.fbCalendarItemContent div.fsm.fwn.fcg a[rel="dialog"]').not('.facebookcount').each(function() {
        wrapNumberInString(this);
    });

    // group page event block guest lists (e.g. 'soandso and 12 other guests')
    j('#pagelet_group_events div.fsm.fwn.fcg a[rel="dialog"]').not('.facebookcount').each(function() {
        wrapNumberInString(this);
    });



    // -------------------------------------------------------------
    // -- TIMELINE-TYPE VIEWS THAT AREN'T TIMELINES OR NEWS FEEDS --
    // -------------------------------------------------------------

    // other friends counts on favorites page like items
    j('.fbStreamTimelineFavFriendContainer a[rel="dialog"]').not('.fbfavinfo').each(function() {
        j(this).addClass('fbfavinfo');
        var txt = j(this).text();
        var parsed = txt.match(/^(\d+(?:,\d+)*)\s+(.*)/);
        if(parsed) {
            j(this).html(
                '<span style="display:none;" class="facebookmetric_hideshow">'+parsed[1]+'</span> '+parsed[2]);
        }
    });


    // mutual friends counts on likes for the favorites page (timeline-type)
    j('.fbStreamTimelineFavInfoContainer').not('.fbfavinfo').each(function() { 

        // returns only the text element of a container that also has other wrapped elements
        // used by the demetrication routine for /name/favorites to remove people like this counts
        j.fn.justtext = function() { return j(this).clone().children().remove().end().text(); };

        j(this).addClass('fbfavinfo');
        var children = j(this).children();
        var txt = j(this).justtext();
        var parsed = txt.match(/^(\d+(?:,\d+)*)\s+(.*)/);
        if(parsed) {
            var newtxt = 
                '<span style="display:none;" class="facebookmetric_hideshow">'+
                    parsed[1]+'</span> '+parsed[2]+'<br/>';
            j(this).html(children).find('div:last').prepend(newtxt);
        }
    });




    // --------------------------------------------------------------------
    // -- NON-TIMELINE VIEWS (POP-UPS, OLD-STYLE PROFILES, GROUPS, etc.) --
    // --------------------------------------------------------------------

    // /find-friends page mutual friends counts, such as 'Jo Blow and 10 mutual friends' 
    demetricateFriendBrowserBlocks();


    // like this and talking about this on old-style Pages
    j('.uiNumberGiant').not('.facebookcount').each(function() {
        j(this).addClass('facebookcount facebookmetric_opacity').css('opacity','0');
    });
        

    // 'Seen by 3' on group posts
    j('.uiUfiSeenCountIcon').not('.facebookcount').each(function() {
        j(this).addClass('facebookcount');
        var txt = j(this).html();
        if(txt) {
            var parsed = txt.match(/^(.*i>)(Seen by)\s+(\d+(?:,\d+)*)/);
            if(parsed) {
                var newhtml = 
                    '<span class="facebookmetric_toggleOFF" style="display:none;">'+parsed[0]+'</span>'+
                    '<span class="facebookmetric_toggleON">'+parsed[1]+parsed[2]+' people</span>';
                j(this).html(newhtml);
            }
        }

    });


    // left-hand sidebar on events -- 'Going', 'Maybe', 'Invited'
    j('.fbEventGuests a[rel="dialog"]').not('.facebookcount').each(function() {
        var txt = j(this).html();
        if(txt) {
            var parsed = txt.match(/(.*)(\(\d+(?:,\d+)*\))/);
            j(this).html(
                parsed[1]+' <span class="facebookmetric_fade" style="display:none;">'+parsed[2]+'</span>'
            );
        }
        j(this).addClass('facebookcount');

    });

    j('.relationshipSection h5 a').not('.facebookcount').each(function() {
        var txt = j(this).html();
        if(txt) {
            var parsed = txt.match(/(.*)(\(\d+(?:,\d+)*\))/);
            j(this).html(
                parsed[1]+' <span class="facebookmetric_fade" style="display:none;">'+parsed[2]+'</span>'
            );
        }
        j(this).addClass('facebookcount');
    });

    // old-style profile mutual friends counts ('39 Mutual Friends')
    j('.inCommonSectionList a[rel="dialog"]').not('.facebookcount').each(function() {
        j(this).addClass('facebookcount');
        /*
        tagAndStyleMetric(
            j(this), 
            '/(\d+(?:,\d+)*)\s(.*)/', 
            'facebookmetric_hideshow', 
            1,
            'display:none;'
        );
        */


        var txt = j(this).html();
        if(txt) {
            var parsed = txt.match(/(\d+(?:,\d+)*)\s(.*)/);
            if(parsed) {
                j(this).html(
                    '<span class="facebookmetric_hideshow" style="display:none;">'+parsed[1]+' </span>'+
                    parsed[2]
                );
            }
        }
    });

    // recommended groups other friends counts
    j('.groupsRecommendedSocialMarkup').find('a[rel="dialog"]').not('.facebookcount').each(function() {
        j(this).addClass('facebookcount');
        var txt = j(this).html();
        if(txt) {
            var parsed = txt.match(/(\d+(?:,\d+)*)\s(.*)/);
            if(parsed) {
                j(this).html(
                    '<span class="facebookmetric_hideshow" style="display:none;">'+parsed[1]+' </span>'+
                    parsed[2]
                );
            }
        }
        /*
        tagAndStyleMetric(
            j(this), 
            '/(\d+(?:,\d+)*)\s(.*)/', 
            'facebookmetric_hideshow', 
            1,
            'display:none;'
        );
        */
    });


    // friend list +1 icons in the 'add friend' buttons
    j('.FriendRequestAdd').find('i').not('.facebookmetric_hideshow').addClass('facebookmetric_hideshow').hide();


    // similar stories pagers on old-style profile lists
    j('.showSimilar span.fsm').not('.facebookcount').each(function() {
        wrapNumberInString(this);
    });

    // ------------------------------------
    // -- ACTION TRIGGERS FOR HOVERCARDS --
    // ------------------------------------
    
    // images that trigger hovercards (such as friend photos on the timeline ribbon)
    j('.hovercard_trigger').mouseenter(toggleHovercards);

    // links also trigger hovercards (such as lists of friends in the old-style profile) 
    j('a[data-hovercard]').mouseenter(toggleHovercards);
    
    // ticker popups
    /*
    j('.fbFeedTickerStory').mouseenter(function() {
        console.log('ticker?');
        toggleTickerOverlay();
    });
    */

    // debug
    if(LINK_HIGHLIGHT_ON) j('a').not('.facebooklink').addClass('facebooklink').css('border','1px solid red');

    if(DBUG) console.timeEnd('demetricator timer');

       


    // -----------------------
    // -- UTILITY FUNCTIONS --
    // -----------------------
    //

    
    // need to mod or remove
    function tagAndStyleMetric(jnode, regex, tagclass, metricposition, style) {
        var txt = jnode.html();
        if(txt) {
            var parsed = txt.match(regex);
            if(parsed) {
                var newhtml = '';
                var newmetric = 
                    '<span class="'+tagclass+'" style="'+style+'">'+parsed[metricposition]+'</span>';

                if(metricposition == 1) {
                    newhtml = newmetric + parsed[2];
                } else if(metricposition == 2) {
                    newhtml = parsed[1] + newmetric;
    //                if(parsed[3]) newhtml += parsed[3];
                }

                jnode.html(newhtml);
            }
        }
    }


    // stragglers -- catching some things that might be left behind by above 
    // (items that have so little defining information that i didn't want to leave
    // such broad selectors higher up)
    j('.UIImageBlock_Content a.uiLinkSubtle[rel="dialog"]').not('.facebookcount').addClass('facebookcount').each(function() {
        wrapNumberInString(this);
    });


    if(callback) callback();

            

} // end demetricate()


// list of people one subscribes to (timeline)
// includes subscriber counts (e.g. 82387 subscribers) and other friends who subscribe
// counts (e.g. Soandso and 3 other friends are subscribed)
// also works for /subscriptions/suggestions/
function demetricateFollowListItem(jnode) {
        var txt;
        var parsed;

        // subscriber counts
        jnode.find('.inlineBlock').not('.fbfollowitem').each(function() { 
            j(this).addClass('fbfollowitem');
            txt = j(this).html();

            if(txt.contains('subscriber')) {
                parsed = txt.match(/(.*·)\s+(\d+(?:,\d+)*)(.*)/);
                if(parsed) {
                    j(this).html(
                        parsed[1]+' <span class="facebookmetric_hideshow" style="display:none;">'+
                        parsed[2]+'</span>'+
                        parsed[3]
                    );
                }
            } 
        });

        // other friends who subscribe counts
        jnode.find('a[rel="dialog"]').not('.fbfollowitem').each(function() {
            j(this).addClass('fbfollowitem');
            wrapNumberInString(this);
        });

}


//
function demetricateFriendBrowserBlocks() {
    if(!demetricatorON) return;

    // friend list +1 icons in the 'add friend' buttons
    j('.FriendRequestAdd').find('i').not('.facebookmetric_hideshow').addClass('facebookmetric_hideshow').hide();

    // /find-friends page mutual friends counts, such as 'Jo Blow and 10 mutual friends' 
    j('.friendBrowserMarginTopTiny a[rel="dialog"]').not('.facebookcount').each(function() {
        wrapNumberInString(this);
    });

    // catches mutual friend blocks on search result pages
    j('a.uiLinkSubtle[rel="dialog"]').not('.facebookcount').each(function() {
        wrapNumberInString(this);
    });
}


// search results, dynamic autocomplete entry metrics (mutual friends, people like this, etc.)
function demetricateSearchResultEntries(jnode) {
    if(!demetricatorON) return;

    if(demetricatorON) {
        j('ul.search li.page').find('.subtext').not('.fbsearchentry').each(function() { 
            j(this).addClass('fbsearchentry');
            j(this).text('people like this · people talk about this'); 
        });

        j('ul.search li.user').find('.subtext').not('.fbsearchentry').each(function() { 
            j(this).addClass('fbsearchentry');
            j(this).text('mutual friends'); 
        });

        j('ul.search li.calltoaction').find('.subtext').not('.fbsearchentry').each(function() { 
            j(this).addClass('fbsearchentry');
            j(this).text('Displaying top results'); 
        });

        j('ul.search li.app').find('.subtext').not('.fbsearchentry').each(function() { 
            j(this).addClass('fbsearchentry');
            j(this).text('monthly users'); 
        });
    }
}


// all 'XX likes this' links under newsfeed items
function demetricateLikesThis() {
    if(!demetricatorON) return;

    // timeline entry feedback blocks: like counts
    //j('.fbTimelineFeedbackCommentLoader').not('.fbtimelineblockcounts').each(function() {
    j('.fbTimelineFeedbackLikes a').not('.fbtimelineblockcounts').each(function() {
        j(this).addClass('fbtimelineblockcounts');
        var html = j(this).html();
        if(html) {
            var parsed = html.match(/^(<i><\/i>)(\d+(?:,\d+)*)/);
            if(parsed) {
                j(this).html(parsed[1]+'<span class="fbtimelineblockcount" style="opacity:0;">'+
                    parsed[2]+'</span>');
            }
        }
    });

    j('.ufiItem a[title="See who likes this"]').not('.fblikesthis').each(function() { 
        var ref = j(this).attr('href');
        var newlink = '<a href="'+ref+'" class="fblikesthis facebookmetric_toggleON rel="dialog" '+
            'title="See who likes this">people</a>';

        j(this).before(newlink);
        j(this).addClass('fblikesthis facebookmetric_toggleOFF').css('display','none');
    });
}


// the chat list has a built-in separator between two lists of possible chatters
// the separator contains a metric like 'MORE ONLINE FRIENDS (8)'.  this separator
// is dynamically altered regularly (10 seconds maybe?).  i store the current
// chat count (for later demetrication)
function demetricateChatSeparator() {
    if(demetricatorON) {
        //var chatsep = j('ul.fbChatOrderedList li.moreOnlineFriends span.text');
        var chatsep = j('.moreOnlineFriends span.text');
        var txt = chatsep.text();
        var parsed = txt.match(/^(.*)\s+(\(\d+(?:,\d+)*\))/);

        if(parsed) {
            chatsep.html(
                parsed[1]+' <span class="facebookmetric_hideshow" style="display:none;">'+parsed[2]+'</span>'
            );
        }
    }
}


// cleans up search result block items
function demetricateSearchResult(sr) {
    // SEARCH RESULTS page
    //var sr = j('.detailedsearch_result');
    
    demetricateAddFriendButtons(sr);

    sr.find('.pls div.fsm.fwn.fcg div.fsm.fwn.fcg').not('.facebookcount').each(function() {
        j(this).addClass('facebookcount');
        var txt = j(this).text();
        if(txt) {
            var parsed = txt.match(/^(.*)\s+(\d+(?:,\d+)*)\s+(.*)/);
            if(parsed) {
                j(this).html(
                    parsed[1]+' <span class="facebookmetric_hideshow" style="display:none;">'+
                    parsed[2]+'</span> '+
                    parsed[3]
                );
            } else {
                parsed = txt.match(/^(\d+(?:,\d+)*)\s+(.*)/);
                if(parsed) {
                    j(this).html(
                        '<span style="display:none;" class="facebookmetric_hideshow">'+parsed[1]+'</span> '+parsed[2]
                    );
                }
            }

        }
    });

    //sr.find('.detailedsearch_actions a:first').not('.facebookcount').each(function() {
    sr.find('.detailedsearch_actions a').not('.facebookcount').each(function() {
        var txt = j(this).text();
        if(txt.contains('mutual') || txt.contains('other')) wrapNumberInString(this);
        else j(this).addClass('facebookcount');
    });

}

// trying to get the 'Seen by' viewer timings demetricated but not having luck yet
// this should do the trick but doesn't catch it for some reason.  will leave for later
function demetricateAriaAlert() {
    var a = j('#ariaPoliteAlert');
    var txt = a.text()
    var alines = txt.match(/[^\r\n]+/g);
    var newhtml = '';

    j.each(alines, function(index,value) { 
        var parsed = this.match(/^(.*·)\s+(\d+:\d+.*)/); 
        if(parsed) {
            if(demetricatorON) {
                newhtml += '<span class="facebookmetric_toggleOFF" style="display:none;">'+parsed[0]+'</span>';
                newhtml += '<span class="facebookmetric_toggleON">'+parsed[1]+' recently</span>';
            } else {
                newhtml += '<span class="facebookmetric_toggleOFF">'+parsed[0]+'</span>';
                newhtml += '<span class="facebookmetric_toggleON" style="display:none;">'+parsed[1]+' recently</span>';
            }
            a.html(newhtml);
        }
    });
}


// like buttons have counts and are dynamically generated
// called from a waitForElements()
function demetricateCommentLikeButton() {

    if(!demetricatorON) return;

    // comment like counts (next to the little thumbs up icon).  currently
    // polling on comment_like_button, may be to narrow (?)
    j('.comment_like_button').not('.fbcommentlike').each(function() {
        var inner = j('<i>').addClass('cmt_like_icon');
        var newlink = j('<a>');

        newlink.attr('title','people like this').attr('rel','dialog').attr('href',j(this).attr('href'));
        newlink.attr('ajaxify',j(this).attr('ajaxify'));
        newlink.addClass('comment_like_button fbcommentlike facebookmetric_toggleON');
        newlink.html(inner);

        j(this).before(newlink);
        j(this).addClass('fbcommentlike facebookmetric_toggleOFF').css('display','none');
    });
}


// the dropdown for more items on the timeline ribbon, has a metric
// that indicates how many more blocks are available to see
// need to fade it's color to match the background so it doesn't collapse
// (taking the down arrow w/ it)
function demetricateRibbonDropdown() {
    j('.fbTimelineMoreButton').find('.fbTimelineRibbon').find('.text').
        not('.fbribboncounts').each(function() {
            j(this).addClass('fbribboncounts');
            var txt = j(this).text();
            console.log('got here. txt = '+txt);
            j(this).html('<span class="fbRibbonDropdown" style="color:#fff">'+txt+'</span>');
    });
}

function limitedSetTimeout(interval, count, max) {
    console.log("round: "+count);
    count++;
    if(count > max) return;
    else setTimeout(function() {
        limitedSetTimeout(interval, count, max);
    }, interval);
}


// toggles the demetrication of hovercards, those overlays that popup
// for individuals/pages showing name, cover image, mutual friend counts, etc.
function toggleHovercards() {
    
    for(var i = 0; i < 2000; i+=50) {
        delayedToggle(i);
        if(i > 1200) i+=200;
    }

    function delayedToggle(t) {
        setTimeout(function() {
            if(demetricatorON) {
                j('.hovercardcount').hide(); 
                j('.FriendRequestAdd i').hide();
            } else {
                j('.hovercardcount').show(); 
                j('.FriendRequestAdd i').show();
            }
        }, t);
    }
}

// same as above but for overlays from the ticker
function toggleTickerOverlay() {
    toggleDemetricator();
}

// '3 seconds ago', '4 minutes ago', 'Wednesday', etc.
// attached to all kinds of things throughout the interface
// timestamps are dynamically updated when in the timeline
// here they get converted to either 'recently' or 'a while ago'
function demetricateTimestamps() {
    if(!demetricatorON) return;
    // adjusts all timestamps to remove the counts of those time segments 
    // (e.g. '8 minutes ago' becomes 'minutes ago')
    j('abbr').not('.fbtimestamp').each(function() {
        var t = j(this).text();
        var newtext;
        var newstamp;

        if(
            t.contains('seconds ago') || 
            t.contains('minutes ago') ||
            t.contains('hours ago') ||
            t.contains('about an hour ago') ||
            t.contains('about a minute ago') ||
            t.contains('at') ||

            t.contains('Yesterday') ||
            t.contains('yesterday') ||

            (
              (
                t.contains('Monday') || 
                t.contains('Tuesday') || 
                t.contains('Wednesday') || 
                t.contains('Thursday') || 
                t.contains('Friday') || 
                t.contains('Saturday') || 
                t.contains('Sunday') 
              ) && !(
                t.contains('January') ||
                t.contains('February') ||
                t.contains('March') ||
                t.contains('April') ||
                t.contains('May') ||
                t.contains('June') ||
                t.contains('July') ||
                t.contains('August') ||
                t.contains('September') ||
                t.contains('October') ||
                t.contains('November') ||
                t.contains('December') 
              )

            )

           )

           newtext = 'recently';

        else if(

            t.contains('January') ||
            t.contains('February') ||
            t.contains('March') ||
            t.contains('April') ||
            t.contains('May') ||
            t.contains('June') ||
            t.contains('July') ||
            t.contains('August') ||
            t.contains('September') ||
            t.contains('October') ||
            t.contains('November') ||
            t.contains('December') ||

            t.contains('weeks ago') ||
            t.contains('months ago') ||
            t.contains('month ago') ||
            t.contains('years ago') ||
            t.contains('year ago')
           ) 

           newtext = 'a while ago';

        else return; 

        newstamp = '<abbr title="'+newtext+'" class="timestamp fbtimestamp facebookmetric_toggleON">'+newtext+'</abbr>';
        j(this).before(newstamp);
        j(this).removeAttr('data-utime1').addClass('facebookmetric_toggleOFF fbtimestamp').css('display','none');
    });
}


// Hovercards only exist when dynamicaly inserted, so no reason to put them within the
// main demetricate() function.  This way they're only called when one appears:
// called by waitForKeyElements on appearance of .HovercardContent
function demetricateHovercard(jnode) {
    if(!demetricatorON) return;

    if(DBUG) console.time('demetricateHovercard timer');
    //console.log("hovercard html: "+jnode.parent().parent().parent().parent().tml());
    //console.log("hovercard html: "+jnode.html());

    // first look for a mutual friends link
    var friendslink = jnode.find('.HovercardContent a[rel="dialog"]');

    // if we have one, and if it hasn't already been demetricated, then demetricate it
    if(friendslink && friendslink.not('span.hovercardcount')) {
        var html = friendslink.html();
        if(html) {
            var parsed = html.match(/^(\d+(?:,\d+)*)\s+(.*)/);
            if(parsed) {
                if(demetricatorON) var disp = "display:none;";
                else var disp = "";
                var newhtml = '<span class="hovercardcount" style="'+disp+'">'+parsed[1]+"</span> "+parsed[2];
                friendslink.html(newhtml);
            }
        }
        //return;
    }
    
    else if(friendslink) {
        if(demetricatorON) friendslink.css('display','none');
        else friendslink.removeAttr('style');
    }

    // sometimes hovercards are somewhat different, requiring a separate attempt at demetricating the 
    // mutual friends count
    var altfriendslink = jnode.find('div.mbs a');

    if(altfriendslink && altfriendslink.not('span.hovercardcount')) {
        var althtml = altfriendslink.html();
        if(althtml) {
            var altparsed = althtml.match(/^(\d+(?:,\d+)*)\s+(.*)/);
            if(altparsed) {
                if(demetricatorON) var altdisp = "display:none;";
                else var altdisp = "";
                var altnewhtml = '<span class="hovercardcount" style="'+altdisp+'">'+altparsed[1]+"</span> "+altparsed[2];
                altfriendslink.html(altnewhtml);
            }
        }
    }

    // +1 on add friend buttons
    j('.FriendRequestAdd i').not('.hovercardcount').addClass('hovercardcount').hide();

    demetricateHovercardFooter(jnode);

    function demetricateHovercardFooter(jnode) {
        var fancount = jnode.find('.fanCount');
        if(fancount) wrapFooterNumber(fancount, 'people');

        jnode.find('.HovercardFooter div.fsm.fwn.fcg').each(function() {
            if(j(this).text().contains('like')) wrapFooterNumber(j(this),'');
            else if(j(this).text().contains('talking')) wrapFooterNumber(j(this),'');
            else if(j(this).text().contains('here')) wrapFooterNumber(j(this),'');
            else wrapFooterNumber(j(this),'');

            /*
            if(j(this).text().contains('like')) wrapFooterNumber(j(this),'people');
            else if(j(this).text().contains('talking')) wrapFooterNumber(j(this),'people are');
            else if(j(this).text().contains('here')) wrapFooterNumber(j(this),'people');
            else wrapFooterNumber(j(this),'people');
            */
        });

        function wrapFooterNumber(jnode, languageadd) {
            if(languageadd.length) languageadd += " ";
            var txt = jnode.text();

            if(txt.contains('this') || txt.contains('here')) {
                var parsed = txt.match(/^(\d+(?:,\d+)*)\s+(.*)/);
                if(parsed) {
                    if(demetricatorON) var disp = "display:none;";
                    else var disp = "";
                    var newhtml = '<span class="hovercardcount" style="'+disp+'">'+
                        parsed[1]+"</span> "+languageadd+parsed[2];
                    if(demetricatorON) var disp = "display:none;";
                    jnode.html(newhtml);
                }
            }
        }

    }

    if(DBUG) console.timeEnd('demetricateHovercard timer');

}

    // accepts a jQuery node, uses a regex to find a number at the beginning of its html text, if it
    // finds it, it wraps that number in a span, hides the number, and puts the rest of the html back 
    // in place.  
    function wrapNumberInString(node) {
        var txt = j(node).html();
        var parsed = txt.match(/^(\d+(?:,\d+)*)\s+(.*)/);
        if(parsed) {
            j(node).html(
                '<span style="display:none;" class="facebookmetric_hideshow">'+parsed[1]+'</span> '+parsed[2]);
        }
        j(node).addClass('facebookcount');
    }

/* will get called repeatedly for all of the elements i've asked it to track */
function newContentLoaded(jnode) {
    //console.log("newContentLoaded: "+jnode.selector);
    if(demetricatorON) demetricate();
}



// mutual friends counts on the message index
function demetricateMessageMutualFriends() {
    j('.mutualFriends').not('.facebookcount').each(function() {
        var txt = j(this).text();
        
        // 'Friends with Someone and 6 others'
        if(txt.contains('with')) {
            j(this).addClass('facebookcount');
            var parsed = txt.match(/^(.*)\s+(\d+(?:,\d+)*)\s+(.*)/);
            if(parsed) {
                j(this).html(
                    parsed[1] + ' <span class="facebookmetric_hideshow" style="display:none;">' + 
                    parsed[2] + ' </span>' + 
                    parsed[3]
                );
            }
        } 

        // '28 mutual friends' - easy
        else {
            wrapNumberInString(this);
        }
    });
}




//function fastNewContentLoaded(jnode) {
function demetricateAddFriendButtons(jnode) {
    if(!demetricatorON) return;

    // friend list +1 icons in the 'add friend' buttons (but not checkmarks on 'Friends' buttons)
    var txt = jnode.find('span.uiButtonText').text(); 
    //if(!txt.contains('Friends')) {
    if(txt.contains('Add Friend')) {
        console.log(txt);
        //jnode.find('i').not('.facebookmetric_hideshow').addClass('facebookmetric_hideshow MYTEST').hide();

        jnode.find('i').not('.facebookcount').each(function() {
            j(this).addClass('facebookcount');
            if(!j(this).hasClass('fbProfileBylineIcon')) 
                j(this).addClass('facebookmetric_hideshow').hide();
        });
    }

        /*
    if(jnode.hasClass('fbProfileBrowserListItem')) {
        jnode.find('i').not('.facebookmetric_hideshow').addClass('facebookmetric_hideshow').hide();
    }
    */
}



// watch for a 'new' page.  when the user clicks a FB link (such as 'Home') it appears to 
// load a new page (e.g. the URL changes), but it's really just a dynamic AJAX substitution
// of the exisiting page's content.  so this function watches for a change in location.href,
// and when it finds one it fires off a few demetricate() calls to catch the incoming content
function checkForNewPage() {
    curURL = window.location.href;

    if(curURL != startURL) {
        console.log("Facebook Demetricator --> new page found: "+curURL);

        if(demetricatorON) for(var i = 0; i < 2000; i+=250) delayedDemetricate(i); 

        startURL = curURL;

    }

    function delayedDemetricate(t) {
        setTimeout(function() { if(demetricatorON) demetricate(); }, t);
    }
}





// waitForKeyElements(): detects and handles dynamically modified AJAX content
// downloaded from: https://gist.github.com/2625891

/* Usage example: 
 
 waitForKeyElements ( "div.comments" , commentCallbackFunction);
 function commentCallbackFunction (jNode) { jNode.text ("Comment changed by waitForKeyElements()."); }

*/

/*
   parameters:

   selectorTxt:    Required. The jQuery selector string that specifies the desired element(s).  
   actionFunction: Required. runs when elements are found. It is passed a jNode to the matched element. 
   bWaitOnce:      Optional. If false, will continue to scan for new elements after first match is found.
   iframeSelector: Optional. If set, identifies the iframe to search. 
*/

function waitForKeyElements (selectorTxt, actionFunction, bWaitOnce, iframeSelector ) {
    var targetNodes, btargetsFound;


    //console.log("waitForKeyElements running for "+selectorTxt);
    if (typeof iframeSelector == "undefined") targetNodes = j(selectorTxt);
    else targetNodes = j(iframeSelector).contents().find(selectorTxt);

    if (targetNodes  &&  targetNodes.length > 0) {
        btargetsFound   = true;

        // found target node(s).  go through each and act if they are new.
        targetNodes.each ( function () {
            var jThis        = j(this);
            var alreadyFound = jThis.data ('alreadyFound')  ||  false;

            if (!alreadyFound) {
                // call the payload function.
                console.log("waitFor got a new element: "+selectorTxt);
                var cancelFound = actionFunction (jThis);
                if (cancelFound) btargetsFound = false;
                else jThis.data ('alreadyFound', true);
            }
        } );
    }

    else {
        btargetsFound   = false;
    }

    // get the timer-control variable for this selector.
    var controlObj      = waitForKeyElements.controlObj  ||  {};
    var controlKey      = selectorTxt.replace (/[^\w]/g, "_");
    var timeControl     = controlObj [controlKey];

    // now set or clear the timer as appropriate.
    if (btargetsFound && bWaitOnce && timeControl) {
        // the only condition where we need to clear the timer.
        clearInterval (timeControl);
        delete controlObj [controlKey]
    }
    else {
        // set a timer, if needed.
        if (!timeControl) {
            timeControl = setInterval ( function () {
                waitForKeyElements(selectorTxt, actionFunction, bWaitOnce, iframeSelector);
                }, ELEMENT_POLL_SPEED
            );

            controlObj [controlKey] = timeControl;
        }
    }

    waitForKeyElements.controlObj = controlObj;
}






/*
 * pasting jQuery right into the script for speed and security reasons 
 * if you're worried whether there's anything nefarious in there, just 
 * delete everything below this and replace it with a new copy fresh
 * from jquery.com. i used 1.7.2 in development so I can't guarantee 
 * any other version * will work
 */

/*! jQuery v@1.8.0 jquery.com | jquery.org/license */
(function(a,b){function G(a){var b=F[a]={};return p.each(a.split(s),function(a,c){b[c]=!0}),b}function J(a,c,d){if(d===b&&a.nodeType===1){var e="data-"+c.replace(I,"-$1").toLowerCase();d=a.getAttribute(e);if(typeof d=="string"){try{d=d==="true"?!0:d==="false"?!1:d==="null"?null:+d+""===d?+d:H.test(d)?p.parseJSON(d):d}catch(f){}p.data(a,c,d)}else d=b}return d}function K(a){var b;for(b in a){if(b==="data"&&p.isEmptyObject(a[b]))continue;if(b!=="toJSON")return!1}return!0}function ba(){return!1}function bb(){return!0}function bh(a){return!a||!a.parentNode||a.parentNode.nodeType===11}function bi(a,b){do a=a[b];while(a&&a.nodeType!==1);return a}function bj(a,b,c){b=b||0;if(p.isFunction(b))return p.grep(a,function(a,d){var e=!!b.call(a,d,a);return e===c});if(b.nodeType)return p.grep(a,function(a,d){return a===b===c});if(typeof b=="string"){var d=p.grep(a,function(a){return a.nodeType===1});if(be.test(b))return p.filter(b,d,!c);b=p.filter(b,d)}return p.grep(a,function(a,d){return p.inArray(a,b)>=0===c})}function bk(a){var b=bl.split("|"),c=a.createDocumentFragment();if(c.createElement)while(b.length)c.createElement(b.pop());return c}function bC(a,b){return a.getElementsByTagName(b)[0]||a.appendChild(a.ownerDocument.createElement(b))}function bD(a,b){if(b.nodeType!==1||!p.hasData(a))return;var c,d,e,f=p._data(a),g=p._data(b,f),h=f.events;if(h){delete g.handle,g.events={};for(c in h)for(d=0,e=h[c].length;d<e;d++)p.event.add(b,c,h[c][d])}g.data&&(g.data=p.extend({},g.data))}function bE(a,b){var c;if(b.nodeType!==1)return;b.clearAttributes&&b.clearAttributes(),b.mergeAttributes&&b.mergeAttributes(a),c=b.nodeName.toLowerCase(),c==="object"?(b.parentNode&&(b.outerHTML=a.outerHTML),p.support.html5Clone&&a.innerHTML&&!p.trim(b.innerHTML)&&(b.innerHTML=a.innerHTML)):c==="input"&&bv.test(a.type)?(b.defaultChecked=b.checked=a.checked,b.value!==a.value&&(b.value=a.value)):c==="option"?b.selected=a.defaultSelected:c==="input"||c==="textarea"?b.defaultValue=a.defaultValue:c==="script"&&b.text!==a.text&&(b.text=a.text),b.removeAttribute(p.expando)}function bF(a){return typeof a.getElementsByTagName!="undefined"?a.getElementsByTagName("*"):typeof a.querySelectorAll!="undefined"?a.querySelectorAll("*"):[]}function bG(a){bv.test(a.type)&&(a.defaultChecked=a.checked)}function bX(a,b){if(b in a)return b;var c=b.charAt(0).toUpperCase()+b.slice(1),d=b,e=bV.length;while(e--){b=bV[e]+c;if(b in a)return b}return d}function bY(a,b){return a=b||a,p.css(a,"display")==="none"||!p.contains(a.ownerDocument,a)}function bZ(a,b){var c,d,e=[],f=0,g=a.length;for(;f<g;f++){c=a[f];if(!c.style)continue;e[f]=p._data(c,"olddisplay"),b?(!e[f]&&c.style.display==="none"&&(c.style.display=""),c.style.display===""&&bY(c)&&(e[f]=p._data(c,"olddisplay",cb(c.nodeName)))):(d=bH(c,"display"),!e[f]&&d!=="none"&&p._data(c,"olddisplay",d))}for(f=0;f<g;f++){c=a[f];if(!c.style)continue;if(!b||c.style.display==="none"||c.style.display==="")c.style.display=b?e[f]||"":"none"}return a}function b$(a,b,c){var d=bO.exec(b);return d?Math.max(0,d[1]-(c||0))+(d[2]||"px"):b}function b_(a,b,c,d){var e=c===(d?"border":"content")?4:b==="width"?1:0,f=0;for(;e<4;e+=2)c==="margin"&&(f+=p.css(a,c+bU[e],!0)),d?(c==="content"&&(f-=parseFloat(bH(a,"padding"+bU[e]))||0),c!=="margin"&&(f-=parseFloat(bH(a,"border"+bU[e]+"Width"))||0)):(f+=parseFloat(bH(a,"padding"+bU[e]))||0,c!=="padding"&&(f+=parseFloat(bH(a,"border"+bU[e]+"Width"))||0));return f}function ca(a,b,c){var d=b==="width"?a.offsetWidth:a.offsetHeight,e=!0,f=p.support.boxSizing&&p.css(a,"boxSizing")==="border-box";if(d<=0){d=bH(a,b);if(d<0||d==null)d=a.style[b];if(bP.test(d))return d;e=f&&(p.support.boxSizingReliable||d===a.style[b]),d=parseFloat(d)||0}return d+b_(a,b,c||(f?"border":"content"),e)+"px"}function cb(a){if(bR[a])return bR[a];var b=p("<"+a+">").appendTo(e.body),c=b.css("display");b.remove();if(c==="none"||c===""){bI=e.body.appendChild(bI||p.extend(e.createElement("iframe"),{frameBorder:0,width:0,height:0}));if(!bJ||!bI.createElement)bJ=(bI.contentWindow||bI.contentDocument).document,bJ.write("<!doctype html><html><body>"),bJ.close();b=bJ.body.appendChild(bJ.createElement(a)),c=bH(b,"display"),e.body.removeChild(bI)}return bR[a]=c,c}function ch(a,b,c,d){var e;if(p.isArray(b))p.each(b,function(b,e){c||cd.test(a)?d(a,e):ch(a+"["+(typeof e=="object"?b:"")+"]",e,c,d)});else if(!c&&p.type(b)==="object")for(e in b)ch(a+"["+e+"]",b[e],c,d);else d(a,b)}function cy(a){return function(b,c){typeof b!="string"&&(c=b,b="*");var d,e,f,g=b.toLowerCase().split(s),h=0,i=g.length;if(p.isFunction(c))for(;h<i;h++)d=g[h],f=/^\+/.test(d),f&&(d=d.substr(1)||"*"),e=a[d]=a[d]||[],e[f?"unshift":"push"](c)}}function cz(a,c,d,e,f,g){f=f||c.dataTypes[0],g=g||{},g[f]=!0;var h,i=a[f],j=0,k=i?i.length:0,l=a===cu;for(;j<k&&(l||!h);j++)h=i[j](c,d,e),typeof h=="string"&&(!l||g[h]?h=b:(c.dataTypes.unshift(h),h=cz(a,c,d,e,h,g)));return(l||!h)&&!g["*"]&&(h=cz(a,c,d,e,"*",g)),h}function cA(a,c){var d,e,f=p.ajaxSettings.flatOptions||{};for(d in c)c[d]!==b&&((f[d]?a:e||(e={}))[d]=c[d]);e&&p.extend(!0,a,e)}function cB(a,c,d){var e,f,g,h,i=a.contents,j=a.dataTypes,k=a.responseFields;for(f in k)f in d&&(c[k[f]]=d[f]);while(j[0]==="*")j.shift(),e===b&&(e=a.mimeType||c.getResponseHeader("content-type"));if(e)for(f in i)if(i[f]&&i[f].test(e)){j.unshift(f);break}if(j[0]in d)g=j[0];else{for(f in d){if(!j[0]||a.converters[f+" "+j[0]]){g=f;break}h||(h=f)}g=g||h}if(g)return g!==j[0]&&j.unshift(g),d[g]}function cC(a,b){var c,d,e,f,g=a.dataTypes.slice(),h=g[0],i={},j=0;a.dataFilter&&(b=a.dataFilter(b,a.dataType));if(g[1])for(c in a.converters)i[c.toLowerCase()]=a.converters[c];for(;e=g[++j];)if(e!=="*"){if(h!=="*"&&h!==e){c=i[h+" "+e]||i["* "+e];if(!c)for(d in i){f=d.split(" ");if(f[1]===e){c=i[h+" "+f[0]]||i["* "+f[0]];if(c){c===!0?c=i[d]:i[d]!==!0&&(e=f[0],g.splice(j--,0,e));break}}}if(c!==!0)if(c&&a["throws"])b=c(b);else try{b=c(b)}catch(k){return{state:"parsererror",error:c?k:"No conversion from "+h+" to "+e}}}h=e}return{state:"success",data:b}}function cK(){try{return new a.XMLHttpRequest}catch(b){}}function cL(){try{return new a.ActiveXObject("Microsoft.XMLHTTP")}catch(b){}}function cT(){return setTimeout(function(){cM=b},0),cM=p.now()}function cU(a,b){p.each(b,function(b,c){var d=(cS[b]||[]).concat(cS["*"]),e=0,f=d.length;for(;e<f;e++)if(d[e].call(a,b,c))return})}function cV(a,b,c){var d,e=0,f=0,g=cR.length,h=p.Deferred().always(function(){delete i.elem}),i=function(){var b=cM||cT(),c=Math.max(0,j.startTime+j.duration-b),d=1-(c/j.duration||0),e=0,f=j.tweens.length;for(;e<f;e++)j.tweens[e].run(d);return h.notifyWith(a,[j,d,c]),d<1&&f?c:(h.resolveWith(a,[j]),!1)},j=h.promise({elem:a,props:p.extend({},b),opts:p.extend(!0,{specialEasing:{}},c),originalProperties:b,originalOptions:c,startTime:cM||cT(),duration:c.duration,tweens:[],createTween:function(b,c,d){var e=p.Tween(a,j.opts,b,c,j.opts.specialEasing[b]||j.opts.easing);return j.tweens.push(e),e},stop:function(b){var c=0,d=b?j.tweens.length:0;for(;c<d;c++)j.tweens[c].run(1);return b?h.resolveWith(a,[j,b]):h.rejectWith(a,[j,b]),this}}),k=j.props;cW(k,j.opts.specialEasing);for(;e<g;e++){d=cR[e].call(j,a,k,j.opts);if(d)return d}return cU(j,k),p.isFunction(j.opts.start)&&j.opts.start.call(a,j),p.fx.timer(p.extend(i,{anim:j,queue:j.opts.queue,elem:a})),j.progress(j.opts.progress).done(j.opts.done,j.opts.complete).fail(j.opts.fail).always(j.opts.always)}function cW(a,b){var c,d,e,f,g;for(c in a){d=p.camelCase(c),e=b[d],f=a[c],p.isArray(f)&&(e=f[1],f=a[c]=f[0]),c!==d&&(a[d]=f,delete a[c]),g=p.cssHooks[d];if(g&&"expand"in g){f=g.expand(f),delete a[d];for(c in f)c in a||(a[c]=f[c],b[c]=e)}else b[d]=e}}function cX(a,b,c){var d,e,f,g,h,i,j,k,l=this,m=a.style,n={},o=[],q=a.nodeType&&bY(a);c.queue||(j=p._queueHooks(a,"fx"),j.unqueued==null&&(j.unqueued=0,k=j.empty.fire,j.empty.fire=function(){j.unqueued||k()}),j.unqueued++,l.always(function(){l.always(function(){j.unqueued--,p.queue(a,"fx").length||j.empty.fire()})})),a.nodeType===1&&("height"in b||"width"in b)&&(c.overflow=[m.overflow,m.overflowX,m.overflowY],p.css(a,"display")==="inline"&&p.css(a,"float")==="none"&&(!p.support.inlineBlockNeedsLayout||cb(a.nodeName)==="inline"?m.display="inline-block":m.zoom=1)),c.overflow&&(m.overflow="hidden",p.support.shrinkWrapBlocks||l.done(function(){m.overflow=c.overflow[0],m.overflowX=c.overflow[1],m.overflowY=c.overflow[2]}));for(d in b){f=b[d];if(cO.exec(f)){delete b[d];if(f===(q?"hide":"show"))continue;o.push(d)}}g=o.length;if(g){h=p._data(a,"fxshow")||p._data(a,"fxshow",{}),q?p(a).show():l.done(function(){p(a).hide()}),l.done(function(){var b;p.removeData(a,"fxshow",!0);for(b in n)p.style(a,b,n[b])});for(d=0;d<g;d++)e=o[d],i=l.createTween(e,q?h[e]:0),n[e]=h[e]||p.style(a,e),e in h||(h[e]=i.start,q&&(i.end=i.start,i.start=e==="width"||e==="height"?1:0))}}function cY(a,b,c,d,e){return new cY.prototype.init(a,b,c,d,e)}function cZ(a,b){var c,d={height:a},e=0;for(;e<4;e+=2-b)c=bU[e],d["margin"+c]=d["padding"+c]=a;return b&&(d.opacity=d.width=a),d}function c_(a){return p.isWindow(a)?a:a.nodeType===9?a.defaultView||a.parentWindow:!1}var c,d,e=a.document,f=a.location,g=a.navigator,h=a.jQuery,i=a.$,j=Array.prototype.push,k=Array.prototype.slice,l=Array.prototype.indexOf,m=Object.prototype.toString,n=Object.prototype.hasOwnProperty,o=String.prototype.trim,p=function(a,b){return new p.fn.init(a,b,c)},q=/[\-+]?(?:\d*\.|)\d+(?:[eE][\-+]?\d+|)/.source,r=/\S/,s=/\s+/,t=r.test("Â ")?/^[\s\xA0]+|[\s\xA0]+$/g:/^\s+|\s+$/g,u=/^(?:[^#<]*(<[\w\W]+>)[^>]*$|#([\w\-]*)$)/,v=/^<(\w+)\s*\/?>(?:<\/\1>|)$/,w=/^[\],:{}\s]*$/,x=/(?:^|:|,)(?:\s*\[)+/g,y=/\\(?:["\\\/bfnrt]|u[\da-fA-F]{4})/g,z=/"[^"\\\r\n]*"|true|false|null|-?(?:\d\d*\.|)\d+(?:[eE][\-+]?\d+|)/g,A=/^-ms-/,B=/-([\da-z])/gi,C=function(a,b){return(b+"").toUpperCase()},D=function(){e.addEventListener?(e.removeEventListener("DOMContentLoaded",D,!1),p.ready()):e.readyState==="complete"&&(e.detachEvent("onreadystatechange",D),p.ready())},E={};p.fn=p.prototype={constructor:p,init:function(a,c,d){var f,g,h,i;if(!a)return this;if(a.nodeType)return this.context=this[0]=a,this.length=1,this;if(typeof a=="string"){a.charAt(0)==="<"&&a.charAt(a.length-1)===">"&&a.length>=3?f=[null,a,null]:f=u.exec(a);if(f&&(f[1]||!c)){if(f[1])return c=c instanceof p?c[0]:c,i=c&&c.nodeType?c.ownerDocument||c:e,a=p.parseHTML(f[1],i,!0),v.test(f[1])&&p.isPlainObject(c)&&this.attr.call(a,c,!0),p.merge(this,a);g=e.getElementById(f[2]);if(g&&g.parentNode){if(g.id!==f[2])return d.find(a);this.length=1,this[0]=g}return this.context=e,this.selector=a,this}return!c||c.jquery?(c||d).find(a):this.constructor(c).find(a)}return p.isFunction(a)?d.ready(a):(a.selector!==b&&(this.selector=a.selector,this.context=a.context),p.makeArray(a,this))},selector:"",jquery:"1.8.0",length:0,size:function(){return this.length},toArray:function(){return k.call(this)},get:function(a){return a==null?this.toArray():a<0?this[this.length+a]:this[a]},pushStack:function(a,b,c){var d=p.merge(this.constructor(),a);return d.prevObject=this,d.context=this.context,b==="find"?d.selector=this.selector+(this.selector?" ":"")+c:b&&(d.selector=this.selector+"."+b+"("+c+")"),d},each:function(a,b){return p.each(this,a,b)},ready:function(a){return p.ready.promise().done(a),this},eq:function(a){return a=+a,a===-1?this.slice(a):this.slice(a,a+1)},first:function(){return this.eq(0)},last:function(){return this.eq(-1)},slice:function(){return this.pushStack(k.apply(this,arguments),"slice",k.call(arguments).join(","))},map:function(a){return this.pushStack(p.map(this,function(b,c){return a.call(b,c,b)}))},end:function(){return this.prevObject||this.constructor(null)},push:j,sort:[].sort,splice:[].splice},p.fn.init.prototype=p.fn,p.extend=p.fn.extend=function(){var a,c,d,e,f,g,h=arguments[0]||{},i=1,j=arguments.length,k=!1;typeof h=="boolean"&&(k=h,h=arguments[1]||{},i=2),typeof h!="object"&&!p.isFunction(h)&&(h={}),j===i&&(h=this,--i);for(;i<j;i++)if((a=arguments[i])!=null)for(c in a){d=h[c],e=a[c];if(h===e)continue;k&&e&&(p.isPlainObject(e)||(f=p.isArray(e)))?(f?(f=!1,g=d&&p.isArray(d)?d:[]):g=d&&p.isPlainObject(d)?d:{},h[c]=p.extend(k,g,e)):e!==b&&(h[c]=e)}return h},p.extend({noConflict:function(b){return a.$===p&&(a.$=i),b&&a.jQuery===p&&(a.jQuery=h),p},isReady:!1,readyWait:1,holdReady:function(a){a?p.readyWait++:p.ready(!0)},ready:function(a){if(a===!0?--p.readyWait:p.isReady)return;if(!e.body)return setTimeout(p.ready,1);p.isReady=!0;if(a!==!0&&--p.readyWait>0)return;d.resolveWith(e,[p]),p.fn.trigger&&p(e).trigger("ready").off("ready")},isFunction:function(a){return p.type(a)==="function"},isArray:Array.isArray||function(a){return p.type(a)==="array"},isWindow:function(a){return a!=null&&a==a.window},isNumeric:function(a){return!isNaN(parseFloat(a))&&isFinite(a)},type:function(a){return a==null?String(a):E[m.call(a)]||"object"},isPlainObject:function(a){if(!a||p.type(a)!=="object"||a.nodeType||p.isWindow(a))return!1;try{if(a.constructor&&!n.call(a,"constructor")&&!n.call(a.constructor.prototype,"isPrototypeOf"))return!1}catch(c){return!1}var d;for(d in a);return d===b||n.call(a,d)},isEmptyObject:function(a){var b;for(b in a)return!1;return!0},error:function(a){throw new Error(a)},parseHTML:function(a,b,c){var d;return!a||typeof a!="string"?null:(typeof b=="boolean"&&(c=b,b=0),b=b||e,(d=v.exec(a))?[b.createElement(d[1])]:(d=p.buildFragment([a],b,c?null:[]),p.merge([],(d.cacheable?p.clone(d.fragment):d.fragment).childNodes)))},parseJSON:function(b){if(!b||typeof b!="string")return null;b=p.trim(b);if(a.JSON&&a.JSON.parse)return a.JSON.parse(b);if(w.test(b.replace(y,"@").replace(z,"]").replace(x,"")))return(new Function("return "+b))();p.error("Invalid JSON: "+b)},parseXML:function(c){var d,e;if(!c||typeof c!="string")return null;try{a.DOMParser?(e=new DOMParser,d=e.parseFromString(c,"text/xml")):(d=new ActiveXObject("Microsoft.XMLDOM"),d.async="false",d.loadXML(c))}catch(f){d=b}return(!d||!d.documentElement||d.getElementsByTagName("parsererror").length)&&p.error("Invalid XML: "+c),d},noop:function(){},globalEval:function(b){b&&r.test(b)&&(a.execScript||function(b){a.eval.call(a,b)})(b)},camelCase:function(a){return a.replace(A,"ms-").replace(B,C)},nodeName:function(a,b){return a.nodeName&&a.nodeName.toUpperCase()===b.toUpperCase()},each:function(a,c,d){var e,f=0,g=a.length,h=g===b||p.isFunction(a);if(d){if(h){for(e in a)if(c.apply(a[e],d)===!1)break}else for(;f<g;)if(c.apply(a[f++],d)===!1)break}else if(h){for(e in a)if(c.call(a[e],e,a[e])===!1)break}else for(;f<g;)if(c.call(a[f],f,a[f++])===!1)break;return a},trim:o?function(a){return a==null?"":o.call(a)}:function(a){return a==null?"":a.toString().replace(t,"")},makeArray:function(a,b){var c,d=b||[];return a!=null&&(c=p.type(a),a.length==null||c==="string"||c==="function"||c==="regexp"||p.isWindow(a)?j.call(d,a):p.merge(d,a)),d},inArray:function(a,b,c){var d;if(b){if(l)return l.call(b,a,c);d=b.length,c=c?c<0?Math.max(0,d+c):c:0;for(;c<d;c++)if(c in b&&b[c]===a)return c}return-1},merge:function(a,c){var d=c.length,e=a.length,f=0;if(typeof d=="number")for(;f<d;f++)a[e++]=c[f];else while(c[f]!==b)a[e++]=c[f++];return a.length=e,a},grep:function(a,b,c){var d,e=[],f=0,g=a.length;c=!!c;for(;f<g;f++)d=!!b(a[f],f),c!==d&&e.push(a[f]);return e},map:function(a,c,d){var e,f,g=[],h=0,i=a.length,j=a instanceof p||i!==b&&typeof i=="number"&&(i>0&&a[0]&&a[i-1]||i===0||p.isArray(a));if(j)for(;h<i;h++)e=c(a[h],h,d),e!=null&&(g[g.length]=e);else for(f in a)e=c(a[f],f,d),e!=null&&(g[g.length]=e);return g.concat.apply([],g)},guid:1,proxy:function(a,c){var d,e,f;return typeof c=="string"&&(d=a[c],c=a,a=d),p.isFunction(a)?(e=k.call(arguments,2),f=function(){return a.apply(c,e.concat(k.call(arguments)))},f.guid=a.guid=a.guid||f.guid||p.guid++,f):b},access:function(a,c,d,e,f,g,h){var i,j=d==null,k=0,l=a.length;if(d&&typeof d=="object"){for(k in d)p.access(a,c,k,d[k],1,g,e);f=1}else if(e!==b){i=h===b&&p.isFunction(e),j&&(i?(i=c,c=function(a,b,c){return i.call(p(a),c)}):(c.call(a,e),c=null));if(c)for(;k<l;k++)c(a[k],d,i?e.call(a[k],k,c(a[k],d)):e,h);f=1}return f?a:j?c.call(a):l?c(a[0],d):g},now:function(){return(new Date).getTime()}}),p.ready.promise=function(b){if(!d){d=p.Deferred();if(e.readyState==="complete"||e.readyState!=="loading"&&e.addEventListener)setTimeout(p.ready,1);else if(e.addEventListener)e.addEventListener("DOMContentLoaded",D,!1),a.addEventListener("load",p.ready,!1);else{e.attachEvent("onreadystatechange",D),a.attachEvent("onload",p.ready);var c=!1;try{c=a.frameElement==null&&e.documentElement}catch(f){}c&&c.doScroll&&function g(){if(!p.isReady){try{c.doScroll("left")}catch(a){return setTimeout(g,50)}p.ready()}}()}}return d.promise(b)},p.each("Boolean Number String Function Array Date RegExp Object".split(" "),function(a,b){E["[object "+b+"]"]=b.toLowerCase()}),c=p(e);var F={};p.Callbacks=function(a){a=typeof a=="string"?F[a]||G(a):p.extend({},a);var c,d,e,f,g,h,i=[],j=!a.once&&[],k=function(b){c=a.memory&&b,d=!0,h=f||0,f=0,g=i.length,e=!0;for(;i&&h<g;h++)if(i[h].apply(b[0],b[1])===!1&&a.stopOnFalse){c=!1;break}e=!1,i&&(j?j.length&&k(j.shift()):c?i=[]:l.disable())},l={add:function(){if(i){var b=i.length;(function d(b){p.each(b,function(b,c){p.isFunction(c)&&(!a.unique||!l.has(c))?i.push(c):c&&c.length&&d(c)})})(arguments),e?g=i.length:c&&(f=b,k(c))}return this},remove:function(){return i&&p.each(arguments,function(a,b){var c;while((c=p.inArray(b,i,c))>-1)i.splice(c,1),e&&(c<=g&&g--,c<=h&&h--)}),this},has:function(a){return p.inArray(a,i)>-1},empty:function(){return i=[],this},disable:function(){return i=j=c=b,this},disabled:function(){return!i},lock:function(){return j=b,c||l.disable(),this},locked:function(){return!j},fireWith:function(a,b){return b=b||[],b=[a,b.slice?b.slice():b],i&&(!d||j)&&(e?j.push(b):k(b)),this},fire:function(){return l.fireWith(this,arguments),this},fired:function(){return!!d}};return l},p.extend({Deferred:function(a){var b=[["resolve","done",p.Callbacks("once memory"),"resolved"],["reject","fail",p.Callbacks("once memory"),"rejected"],["notify","progress",p.Callbacks("memory")]],c="pending",d={state:function(){return c},always:function(){return e.done(arguments).fail(arguments),this},then:function(){var a=arguments;return p.Deferred(function(c){p.each(b,function(b,d){var f=d[0],g=a[b];e[d[1]](p.isFunction(g)?function(){var a=g.apply(this,arguments);a&&p.isFunction(a.promise)?a.promise().done(c.resolve).fail(c.reject).progress(c.notify):c[f+"With"](this===e?c:this,[a])}:c[f])}),a=null}).promise()},promise:function(a){return typeof a=="object"?p.extend(a,d):d}},e={};return d.pipe=d.then,p.each(b,function(a,f){var g=f[2],h=f[3];d[f[1]]=g.add,h&&g.add(function(){c=h},b[a^1][2].disable,b[2][2].lock),e[f[0]]=g.fire,e[f[0]+"With"]=g.fireWith}),d.promise(e),a&&a.call(e,e),e},when:function(a){var b=0,c=k.call(arguments),d=c.length,e=d!==1||a&&p.isFunction(a.promise)?d:0,f=e===1?a:p.Deferred(),g=function(a,b,c){return function(d){b[a]=this,c[a]=arguments.length>1?k.call(arguments):d,c===h?f.notifyWith(b,c):--e||f.resolveWith(b,c)}},h,i,j;if(d>1){h=new Array(d),i=new Array(d),j=new Array(d);for(;b<d;b++)c[b]&&p.isFunction(c[b].promise)?c[b].promise().done(g(b,j,c)).fail(f.reject).progress(g(b,i,h)):--e}return e||f.resolveWith(j,c),f.promise()}}),p.support=function(){var b,c,d,f,g,h,i,j,k,l,m,n=e.createElement("div");n.setAttribute("className","t"),n.innerHTML="  <link/><table></table><a href='/a'>a</a><input type='checkbox'/>",c=n.getElementsByTagName("*"),d=n.getElementsByTagName("a")[0],d.style.cssText="top:1px;float:left;opacity:.5";if(!c||!c.length||!d)return{};f=e.createElement("select"),g=f.appendChild(e.createElement("option")),h=n.getElementsByTagName("input")[0],b={leadingWhitespace:n.firstChild.nodeType===3,tbody:!n.getElementsByTagName("tbody").length,htmlSerialize:!!n.getElementsByTagName("link").length,style:/top/.test(d.getAttribute("style")),hrefNormalized:d.getAttribute("href")==="/a",opacity:/^0.5/.test(d.style.opacity),cssFloat:!!d.style.cssFloat,checkOn:h.value==="on",optSelected:g.selected,getSetAttribute:n.className!=="t",enctype:!!e.createElement("form").enctype,html5Clone:e.createElement("nav").cloneNode(!0).outerHTML!=="<:nav></:nav>",boxModel:e.compatMode==="CSS1Compat",submitBubbles:!0,changeBubbles:!0,focusinBubbles:!1,deleteExpando:!0,noCloneEvent:!0,inlineBlockNeedsLayout:!1,shrinkWrapBlocks:!1,reliableMarginRight:!0,boxSizingReliable:!0,pixelPosition:!1},h.checked=!0,b.noCloneChecked=h.cloneNode(!0).checked,f.disabled=!0,b.optDisabled=!g.disabled;try{delete n.test}catch(o){b.deleteExpando=!1}!n.addEventListener&&n.attachEvent&&n.fireEvent&&(n.attachEvent("onclick",m=function(){b.noCloneEvent=!1}),n.cloneNode(!0).fireEvent("onclick"),n.detachEvent("onclick",m)),h=e.createElement("input"),h.value="t",h.setAttribute("type","radio"),b.radioValue=h.value==="t",h.setAttribute("checked","checked"),h.setAttribute("name","t"),n.appendChild(h),i=e.createDocumentFragment(),i.appendChild(n.lastChild),b.checkClone=i.cloneNode(!0).cloneNode(!0).lastChild.checked,b.appendChecked=h.checked,i.removeChild(h),i.appendChild(n);if(n.attachEvent)for(k in{submit:!0,change:!0,focusin:!0})j="on"+k,l=j in n,l||(n.setAttribute(j,"return;"),l=typeof n[j]=="function"),b[k+"Bubbles"]=l;return p(function(){var c,d,f,g,h="padding:0;margin:0;border:0;display:block;overflow:hidden;",i=e.getElementsByTagName("body")[0];if(!i)return;c=e.createElement("div"),c.style.cssText="visibility:hidden;border:0;width:0;height:0;position:static;top:0;margin-top:1px",i.insertBefore(c,i.firstChild),d=e.createElement("div"),c.appendChild(d),d.innerHTML="<table><tr><td></td><td>t</td></tr></table>",f=d.getElementsByTagName("td"),f[0].style.cssText="padding:0;margin:0;border:0;display:none",l=f[0].offsetHeight===0,f[0].style.display="",f[1].style.display="none",b.reliableHiddenOffsets=l&&f[0].offsetHeight===0,d.innerHTML="",d.style.cssText="box-sizing:border-box;-moz-box-sizing:border-box;-webkit-box-sizing:border-box;padding:1px;border:1px;display:block;width:4px;margin-top:1%;position:absolute;top:1%;",b.boxSizing=d.offsetWidth===4,b.doesNotIncludeMarginInBodyOffset=i.offsetTop!==1,a.getComputedStyle&&(b.pixelPosition=(a.getComputedStyle(d,null)||{}).top!=="1%",b.boxSizingReliable=(a.getComputedStyle(d,null)||{width:"4px"}).width==="4px",g=e.createElement("div"),g.style.cssText=d.style.cssText=h,g.style.marginRight=g.style.width="0",d.style.width="1px",d.appendChild(g),b.reliableMarginRight=!parseFloat((a.getComputedStyle(g,null)||{}).marginRight)),typeof d.style.zoom!="undefined"&&(d.innerHTML="",d.style.cssText=h+"width:1px;padding:1px;display:inline;zoom:1",b.inlineBlockNeedsLayout=d.offsetWidth===3,d.style.display="block",d.style.overflow="visible",d.innerHTML="<div></div>",d.firstChild.style.width="5px",b.shrinkWrapBlocks=d.offsetWidth!==3,c.style.zoom=1),i.removeChild(c),c=d=f=g=null}),i.removeChild(n),c=d=f=g=h=i=n=null,b}();var H=/^(?:\{.*\}|\[.*\])$/,I=/([A-Z])/g;p.extend({cache:{},deletedIds:[],uuid:0,expando:"jQuery"+(p.fn.jquery+Math.random()).replace(/\D/g,""),noData:{embed:!0,object:"clsid:D27CDB6E-AE6D-11cf-96B8-444553540000",applet:!0},hasData:function(a){return a=a.nodeType?p.cache[a[p.expando]]:a[p.expando],!!a&&!K(a)},data:function(a,c,d,e){if(!p.acceptData(a))return;var f,g,h=p.expando,i=typeof c=="string",j=a.nodeType,k=j?p.cache:a,l=j?a[h]:a[h]&&h;if((!l||!k[l]||!e&&!k[l].data)&&i&&d===b)return;l||(j?a[h]=l=p.deletedIds.pop()||++p.uuid:l=h),k[l]||(k[l]={},j||(k[l].toJSON=p.noop));if(typeof c=="object"||typeof c=="function")e?k[l]=p.extend(k[l],c):k[l].data=p.extend(k[l].data,c);return f=k[l],e||(f.data||(f.data={}),f=f.data),d!==b&&(f[p.camelCase(c)]=d),i?(g=f[c],g==null&&(g=f[p.camelCase(c)])):g=f,g},removeData:function(a,b,c){if(!p.acceptData(a))return;var d,e,f,g=a.nodeType,h=g?p.cache:a,i=g?a[p.expando]:p.expando;if(!h[i])return;if(b){d=c?h[i]:h[i].data;if(d){p.isArray(b)||(b in d?b=[b]:(b=p.camelCase(b),b in d?b=[b]:b=b.split(" ")));for(e=0,f=b.length;e<f;e++)delete d[b[e]];if(!(c?K:p.isEmptyObject)(d))return}}if(!c){delete h[i].data;if(!K(h[i]))return}g?p.cleanData([a],!0):p.support.deleteExpando||h!=h.window?delete h[i]:h[i]=null},_data:function(a,b,c){return p.data(a,b,c,!0)},acceptData:function(a){var b=a.nodeName&&p.noData[a.nodeName.toLowerCase()];return!b||b!==!0&&a.getAttribute("classid")===b}}),p.fn.extend({data:function(a,c){var d,e,f,g,h,i=this[0],j=0,k=null;if(a===b){if(this.length){k=p.data(i);if(i.nodeType===1&&!p._data(i,"parsedAttrs")){f=i.attributes;for(h=f.length;j<h;j++)g=f[j].name,g.indexOf("data-")===0&&(g=p.camelCase(g.substring(5)),J(i,g,k[g]));p._data(i,"parsedAttrs",!0)}}return k}return typeof a=="object"?this.each(function(){p.data(this,a)}):(d=a.split(".",2),d[1]=d[1]?"."+d[1]:"",e=d[1]+"!",p.access(this,function(c){if(c===b)return k=this.triggerHandler("getData"+e,[d[0]]),k===b&&i&&(k=p.data(i,a),k=J(i,a,k)),k===b&&d[1]?this.data(d[0]):k;d[1]=c,this.each(function(){var b=p(this);b.triggerHandler("setData"+e,d),p.data(this,a,c),b.triggerHandler("changeData"+e,d)})},null,c,arguments.length>1,null,!1))},removeData:function(a){return this.each(function(){p.removeData(this,a)})}}),p.extend({queue:function(a,b,c){var d;if(a)return b=(b||"fx")+"queue",d=p._data(a,b),c&&(!d||p.isArray(c)?d=p._data(a,b,p.makeArray(c)):d.push(c)),d||[]},dequeue:function(a,b){b=b||"fx";var c=p.queue(a,b),d=c.shift(),e=p._queueHooks(a,b),f=function(){p.dequeue(a,b)};d==="inprogress"&&(d=c.shift()),d&&(b==="fx"&&c.unshift("inprogress"),delete e.stop,d.call(a,f,e)),!c.length&&e&&e.empty.fire()},_queueHooks:function(a,b){var c=b+"queueHooks";return p._data(a,c)||p._data(a,c,{empty:p.Callbacks("once memory").add(function(){p.removeData(a,b+"queue",!0),p.removeData(a,c,!0)})})}}),p.fn.extend({queue:function(a,c){var d=2;return typeof a!="string"&&(c=a,a="fx",d--),arguments.length<d?p.queue(this[0],a):c===b?this:this.each(function(){var b=p.queue(this,a,c);p._queueHooks(this,a),a==="fx"&&b[0]!=="inprogress"&&p.dequeue(this,a)})},dequeue:function(a){return this.each(function(){p.dequeue(this,a)})},delay:function(a,b){return a=p.fx?p.fx.speeds[a]||a:a,b=b||"fx",this.queue(b,function(b,c){var d=setTimeout(b,a);c.stop=function(){clearTimeout(d)}})},clearQueue:function(a){return this.queue(a||"fx",[])},promise:function(a,c){var d,e=1,f=p.Deferred(),g=this,h=this.length,i=function(){--e||f.resolveWith(g,[g])};typeof a!="string"&&(c=a,a=b),a=a||"fx";while(h--)(d=p._data(g[h],a+"queueHooks"))&&d.empty&&(e++,d.empty.add(i));return i(),f.promise(c)}});var L,M,N,O=/[\t\r\n]/g,P=/\r/g,Q=/^(?:button|input)$/i,R=/^(?:button|input|object|select|textarea)$/i,S=/^a(?:rea|)$/i,T=/^(?:autofocus|autoplay|async|checked|controls|defer|disabled|hidden|loop|multiple|open|readonly|required|scoped|selected)$/i,U=p.support.getSetAttribute;p.fn.extend({attr:function(a,b){return p.access(this,p.attr,a,b,arguments.length>1)},removeAttr:function(a){return this.each(function(){p.removeAttr(this,a)})},prop:function(a,b){return p.access(this,p.prop,a,b,arguments.length>1)},removeProp:function(a){return a=p.propFix[a]||a,this.each(function(){try{this[a]=b,delete this[a]}catch(c){}})},addClass:function(a){var b,c,d,e,f,g,h;if(p.isFunction(a))return this.each(function(b){p(this).addClass(a.call(this,b,this.className))});if(a&&typeof a=="string"){b=a.split(s);for(c=0,d=this.length;c<d;c++){e=this[c];if(e.nodeType===1)if(!e.className&&b.length===1)e.className=a;else{f=" "+e.className+" ";for(g=0,h=b.length;g<h;g++)~f.indexOf(" "+b[g]+" ")||(f+=b[g]+" ");e.className=p.trim(f)}}}return this},removeClass:function(a){var c,d,e,f,g,h,i;if(p.isFunction(a))return this.each(function(b){p(this).removeClass(a.call(this,b,this.className))});if(a&&typeof a=="string"||a===b){c=(a||"").split(s);for(h=0,i=this.length;h<i;h++){e=this[h];if(e.nodeType===1&&e.className){d=(" "+e.className+" ").replace(O," ");for(f=0,g=c.length;f<g;f++)while(d.indexOf(" "+c[f]+" ")>-1)d=d.replace(" "+c[f]+" "," ");e.className=a?p.trim(d):""}}}return this},toggleClass:function(a,b){var c=typeof a,d=typeof b=="boolean";return p.isFunction(a)?this.each(function(c){p(this).toggleClass(a.call(this,c,this.className,b),b)}):this.each(function(){if(c==="string"){var e,f=0,g=p(this),h=b,i=a.split(s);while(e=i[f++])h=d?h:!g.hasClass(e),g[h?"addClass":"removeClass"](e)}else if(c==="undefined"||c==="boolean")this.className&&p._data(this,"__className__",this.className),this.className=this.className||a===!1?"":p._data(this,"__className__")||""})},hasClass:function(a){var b=" "+a+" ",c=0,d=this.length;for(;c<d;c++)if(this[c].nodeType===1&&(" "+this[c].className+" ").replace(O," ").indexOf(b)>-1)return!0;return!1},val:function(a){var c,d,e,f=this[0];if(!arguments.length){if(f)return c=p.valHooks[f.type]||p.valHooks[f.nodeName.toLowerCase()],c&&"get"in c&&(d=c.get(f,"value"))!==b?d:(d=f.value,typeof d=="string"?d.replace(P,""):d==null?"":d);return}return e=p.isFunction(a),this.each(function(d){var f,g=p(this);if(this.nodeType!==1)return;e?f=a.call(this,d,g.val()):f=a,f==null?f="":typeof f=="number"?f+="":p.isArray(f)&&(f=p.map(f,function(a){return a==null?"":a+""})),c=p.valHooks[this.type]||p.valHooks[this.nodeName.toLowerCase()];if(!c||!("set"in c)||c.set(this,f,"value")===b)this.value=f})}}),p.extend({valHooks:{option:{get:function(a){var b=a.attributes.value;return!b||b.specified?a.value:a.text}},select:{get:function(a){var b,c,d,e,f=a.selectedIndex,g=[],h=a.options,i=a.type==="select-one";if(f<0)return null;c=i?f:0,d=i?f+1:h.length;for(;c<d;c++){e=h[c];if(e.selected&&(p.support.optDisabled?!e.disabled:e.getAttribute("disabled")===null)&&(!e.parentNode.disabled||!p.nodeName(e.parentNode,"optgroup"))){b=p(e).val();if(i)return b;g.push(b)}}return i&&!g.length&&h.length?p(h[f]).val():g},set:function(a,b){var c=p.makeArray(b);return p(a).find("option").each(function(){this.selected=p.inArray(p(this).val(),c)>=0}),c.length||(a.selectedIndex=-1),c}}},attrFn:{},attr:function(a,c,d,e){var f,g,h,i=a.nodeType;if(!a||i===3||i===8||i===2)return;if(e&&p.isFunction(p.fn[c]))return p(a)[c](d);if(typeof a.getAttribute=="undefined")return p.prop(a,c,d);h=i!==1||!p.isXMLDoc(a),h&&(c=c.toLowerCase(),g=p.attrHooks[c]||(T.test(c)?M:L));if(d!==b){if(d===null){p.removeAttr(a,c);return}return g&&"set"in g&&h&&(f=g.set(a,d,c))!==b?f:(a.setAttribute(c,""+d),d)}return g&&"get"in g&&h&&(f=g.get(a,c))!==null?f:(f=a.getAttribute(c),f===null?b:f)},removeAttr:function(a,b){var c,d,e,f,g=0;if(b&&a.nodeType===1){d=b.split(s);for(;g<d.length;g++)e=d[g],e&&(c=p.propFix[e]||e,f=T.test(e),f||p.attr(a,e,""),a.removeAttribute(U?e:c),f&&c in a&&(a[c]=!1))}},attrHooks:{type:{set:function(a,b){if(Q.test(a.nodeName)&&a.parentNode)p.error("type property can't be changed");else if(!p.support.radioValue&&b==="radio"&&p.nodeName(a,"input")){var c=a.value;return a.setAttribute("type",b),c&&(a.value=c),b}}},value:{get:function(a,b){return L&&p.nodeName(a,"button")?L.get(a,b):b in a?a.value:null},set:function(a,b,c){if(L&&p.nodeName(a,"button"))return L.set(a,b,c);a.value=b}}},propFix:{tabindex:"tabIndex",readonly:"readOnly","for":"htmlFor","class":"className",maxlength:"maxLength",cellspacing:"cellSpacing",cellpadding:"cellPadding",rowspan:"rowSpan",colspan:"colSpan",usemap:"useMap",frameborder:"frameBorder",contenteditable:"contentEditable"},prop:function(a,c,d){var e,f,g,h=a.nodeType;if(!a||h===3||h===8||h===2)return;return g=h!==1||!p.isXMLDoc(a),g&&(c=p.propFix[c]||c,f=p.propHooks[c]),d!==b?f&&"set"in f&&(e=f.set(a,d,c))!==b?e:a[c]=d:f&&"get"in f&&(e=f.get(a,c))!==null?e:a[c]},propHooks:{tabIndex:{get:function(a){var c=a.getAttributeNode("tabindex");return c&&c.specified?parseInt(c.value,10):R.test(a.nodeName)||S.test(a.nodeName)&&a.href?0:b}}}}),M={get:function(a,c){var d,e=p.prop(a,c);return e===!0||typeof e!="boolean"&&(d=a.getAttributeNode(c))&&d.nodeValue!==!1?c.toLowerCase():b},set:function(a,b,c){var d;return b===!1?p.removeAttr(a,c):(d=p.propFix[c]||c,d in a&&(a[d]=!0),a.setAttribute(c,c.toLowerCase())),c}},U||(N={name:!0,id:!0,coords:!0},L=p.valHooks.button={get:function(a,c){var d;return d=a.getAttributeNode(c),d&&(N[c]?d.value!=="":d.specified)?d.value:b},set:function(a,b,c){var d=a.getAttributeNode(c);return d||(d=e.createAttribute(c),a.setAttributeNode(d)),d.value=b+""}},p.each(["width","height"],function(a,b){p.attrHooks[b]=p.extend(p.attrHooks[b],{set:function(a,c){if(c==="")return a.setAttribute(b,"auto"),c}})}),p.attrHooks.contenteditable={get:L.get,set:function(a,b,c){b===""&&(b="false"),L.set(a,b,c)}}),p.support.hrefNormalized||p.each(["href","src","width","height"],function(a,c){p.attrHooks[c]=p.extend(p.attrHooks[c],{get:function(a){var d=a.getAttribute(c,2);return d===null?b:d}})}),p.support.style||(p.attrHooks.style={get:function(a){return a.style.cssText.toLowerCase()||b},set:function(a,b){return a.style.cssText=""+b}}),p.support.optSelected||(p.propHooks.selected=p.extend(p.propHooks.selected,{get:function(a){var b=a.parentNode;return b&&(b.selectedIndex,b.parentNode&&b.parentNode.selectedIndex),null}})),p.support.enctype||(p.propFix.enctype="encoding"),p.support.checkOn||p.each(["radio","checkbox"],function(){p.valHooks[this]={get:function(a){return a.getAttribute("value")===null?"on":a.value}}}),p.each(["radio","checkbox"],function(){p.valHooks[this]=p.extend(p.valHooks[this],{set:function(a,b){if(p.isArray(b))return a.checked=p.inArray(p(a).val(),b)>=0}})});var V=/^(?:textarea|input|select)$/i,W=/^([^\.]*|)(?:\.(.+)|)$/,X=/(?:^|\s)hover(\.\S+|)\b/,Y=/^key/,Z=/^(?:mouse|contextmenu)|click/,$=/^(?:focusinfocus|focusoutblur)$/,_=function(a){return p.event.special.hover?a:a.replace(X,"mouseenter$1 mouseleave$1")};p.event={add:function(a,c,d,e,f){var g,h,i,j,k,l,m,n,o,q,r;if(a.nodeType===3||a.nodeType===8||!c||!d||!(g=p._data(a)))return;d.handler&&(o=d,d=o.handler,f=o.selector),d.guid||(d.guid=p.guid++),i=g.events,i||(g.events=i={}),h=g.handle,h||(g.handle=h=function(a){return typeof p!="undefined"&&(!a||p.event.triggered!==a.type)?p.event.dispatch.apply(h.elem,arguments):b},h.elem=a),c=p.trim(_(c)).split(" ");for(j=0;j<c.length;j++){k=W.exec(c[j])||[],l=k[1],m=(k[2]||"").split(".").sort(),r=p.event.special[l]||{},l=(f?r.delegateType:r.bindType)||l,r=p.event.special[l]||{},n=p.extend({type:l,origType:k[1],data:e,handler:d,guid:d.guid,selector:f,namespace:m.join(".")},o),q=i[l];if(!q){q=i[l]=[],q.delegateCount=0;if(!r.setup||r.setup.call(a,e,m,h)===!1)a.addEventListener?a.addEventListener(l,h,!1):a.attachEvent&&a.attachEvent("on"+l,h)}r.add&&(r.add.call(a,n),n.handler.guid||(n.handler.guid=d.guid)),f?q.splice(q.delegateCount++,0,n):q.push(n),p.event.global[l]=!0}a=null},global:{},remove:function(a,b,c,d,e){var f,g,h,i,j,k,l,m,n,o,q,r=p.hasData(a)&&p._data(a);if(!r||!(m=r.events))return;b=p.trim(_(b||"")).split(" ");for(f=0;f<b.length;f++){g=W.exec(b[f])||[],h=i=g[1],j=g[2];if(!h){for(h in m)p.event.remove(a,h+b[f],c,d,!0);continue}n=p.event.special[h]||{},h=(d?n.delegateType:n.bindType)||h,o=m[h]||[],k=o.length,j=j?new RegExp("(^|\\.)"+j.split(".").sort().join("\\.(?:.*\\.|)")+"(\\.|$)"):null;for(l=0;l<o.length;l++)q=o[l],(e||i===q.origType)&&(!c||c.guid===q.guid)&&(!j||j.test(q.namespace))&&(!d||d===q.selector||d==="**"&&q.selector)&&(o.splice(l--,1),q.selector&&o.delegateCount--,n.remove&&n.remove.call(a,q));o.length===0&&k!==o.length&&((!n.teardown||n.teardown.call(a,j,r.handle)===!1)&&p.removeEvent(a,h,r.handle),delete m[h])}p.isEmptyObject(m)&&(delete r.handle,p.removeData(a,"events",!0))},customEvent:{getData:!0,setData:!0,changeData:!0},trigger:function(c,d,f,g){if(!f||f.nodeType!==3&&f.nodeType!==8){var h,i,j,k,l,m,n,o,q,r,s=c.type||c,t=[];if($.test(s+p.event.triggered))return;s.indexOf("!")>=0&&(s=s.slice(0,-1),i=!0),s.indexOf(".")>=0&&(t=s.split("."),s=t.shift(),t.sort());if((!f||p.event.customEvent[s])&&!p.event.global[s])return;c=typeof c=="object"?c[p.expando]?c:new p.Event(s,c):new p.Event(s),c.type=s,c.isTrigger=!0,c.exclusive=i,c.namespace=t.join("."),c.namespace_re=c.namespace?new RegExp("(^|\\.)"+t.join("\\.(?:.*\\.|)")+"(\\.|$)"):null,m=s.indexOf(":")<0?"on"+s:"";if(!f){h=p.cache;for(j in h)h[j].events&&h[j].events[s]&&p.event.trigger(c,d,h[j].handle.elem,!0);return}c.result=b,c.target||(c.target=f),d=d!=null?p.makeArray(d):[],d.unshift(c),n=p.event.special[s]||{};if(n.trigger&&n.trigger.apply(f,d)===!1)return;q=[[f,n.bindType||s]];if(!g&&!n.noBubble&&!p.isWindow(f)){r=n.delegateType||s,k=$.test(r+s)?f:f.parentNode;for(l=f;k;k=k.parentNode)q.push([k,r]),l=k;l===(f.ownerDocument||e)&&q.push([l.defaultView||l.parentWindow||a,r])}for(j=0;j<q.length&&!c.isPropagationStopped();j++)k=q[j][0],c.type=q[j][1],o=(p._data(k,"events")||{})[c.type]&&p._data(k,"handle"),o&&o.apply(k,d),o=m&&k[m],o&&p.acceptData(k)&&o.apply(k,d)===!1&&c.preventDefault();return c.type=s,!g&&!c.isDefaultPrevented()&&(!n._default||n._default.apply(f.ownerDocument,d)===!1)&&(s!=="click"||!p.nodeName(f,"a"))&&p.acceptData(f)&&m&&f[s]&&(s!=="focus"&&s!=="blur"||c.target.offsetWidth!==0)&&!p.isWindow(f)&&(l=f[m],l&&(f[m]=null),p.event.triggered=s,f[s](),p.event.triggered=b,l&&(f[m]=l)),c.result}return},dispatch:function(c){c=p.event.fix(c||a.event);var d,e,f,g,h,i,j,k,l,m,n,o=(p._data(this,"events")||{})[c.type]||[],q=o.delegateCount,r=[].slice.call(arguments),s=!c.exclusive&&!c.namespace,t=p.event.special[c.type]||{},u=[];r[0]=c,c.delegateTarget=this;if(t.preDispatch&&t.preDispatch.call(this,c)===!1)return;if(q&&(!c.button||c.type!=="click")){g=p(this),g.context=this;for(f=c.target;f!=this;f=f.parentNode||this)if(f.disabled!==!0||c.type!=="click"){i={},k=[],g[0]=f;for(d=0;d<q;d++)l=o[d],m=l.selector,i[m]===b&&(i[m]=g.is(m)),i[m]&&k.push(l);k.length&&u.push({elem:f,matches:k})}}o.length>q&&u.push({elem:this,matches:o.slice(q)});for(d=0;d<u.length&&!c.isPropagationStopped();d++){j=u[d],c.currentTarget=j.elem;for(e=0;e<j.matches.length&&!c.isImmediatePropagationStopped();e++){l=j.matches[e];if(s||!c.namespace&&!l.namespace||c.namespace_re&&c.namespace_re.test(l.namespace))c.data=l.data,c.handleObj=l,h=((p.event.special[l.origType]||{}).handle||l.handler).apply(j.elem,r),h!==b&&(c.result=h,h===!1&&(c.preventDefault(),c.stopPropagation()))}}return t.postDispatch&&t.postDispatch.call(this,c),c.result},props:"attrChange attrName relatedNode srcElement altKey bubbles cancelable ctrlKey currentTarget eventPhase metaKey relatedTarget shiftKey target timeStamp view which".split(" "),fixHooks:{},keyHooks:{props:"char charCode key keyCode".split(" "),filter:function(a,b){return a.which==null&&(a.which=b.charCode!=null?b.charCode:b.keyCode),a}},mouseHooks:{props:"button buttons clientX clientY fromElement offsetX offsetY pageX pageY screenX screenY toElement".split(" "),filter:function(a,c){var d,f,g,h=c.button,i=c.fromElement;return a.pageX==null&&c.clientX!=null&&(d=a.target.ownerDocument||e,f=d.documentElement,g=d.body,a.pageX=c.clientX+(f&&f.scrollLeft||g&&g.scrollLeft||0)-(f&&f.clientLeft||g&&g.clientLeft||0),a.pageY=c.clientY+(f&&f.scrollTop||g&&g.scrollTop||0)-(f&&f.clientTop||g&&g.clientTop||0)),!a.relatedTarget&&i&&(a.relatedTarget=i===a.target?c.toElement:i),!a.which&&h!==b&&(a.which=h&1?1:h&2?3:h&4?2:0),a}},fix:function(a){if(a[p.expando])return a;var b,c,d=a,f=p.event.fixHooks[a.type]||{},g=f.props?this.props.concat(f.props):this.props;a=p.Event(d);for(b=g.length;b;)c=g[--b],a[c]=d[c];return a.target||(a.target=d.srcElement||e),a.target.nodeType===3&&(a.target=a.target.parentNode),a.metaKey=!!a.metaKey,f.filter?f.filter(a,d):a},special:{ready:{setup:p.bindReady},load:{noBubble:!0},focus:{delegateType:"focusin"},blur:{delegateType:"focusout"},beforeunload:{setup:function(a,b,c){p.isWindow(this)&&(this.onbeforeunload=c)},teardown:function(a,b){this.onbeforeunload===b&&(this.onbeforeunload=null)}}},simulate:function(a,b,c,d){var e=p.extend(new p.Event,c,{type:a,isSimulated:!0,originalEvent:{}});d?p.event.trigger(e,null,b):p.event.dispatch.call(b,e),e.isDefaultPrevented()&&c.preventDefault()}},p.event.handle=p.event.dispatch,p.removeEvent=e.removeEventListener?function(a,b,c){a.removeEventListener&&a.removeEventListener(b,c,!1)}:function(a,b,c){var d="on"+b;a.detachEvent&&(typeof a[d]=="undefined"&&(a[d]=null),a.detachEvent(d,c))},p.Event=function(a,b){if(this instanceof p.Event)a&&a.type?(this.originalEvent=a,this.type=a.type,this.isDefaultPrevented=a.defaultPrevented||a.returnValue===!1||a.getPreventDefault&&a.getPreventDefault()?bb:ba):this.type=a,b&&p.extend(this,b),this.timeStamp=a&&a.timeStamp||p.now(),this[p.expando]=!0;else return new p.Event(a,b)},p.Event.prototype={preventDefault:function(){this.isDefaultPrevented=bb;var a=this.originalEvent;if(!a)return;a.preventDefault?a.preventDefault():a.returnValue=!1},stopPropagation:function(){this.isPropagationStopped=bb;var a=this.originalEvent;if(!a)return;a.stopPropagation&&a.stopPropagation(),a.cancelBubble=!0},stopImmediatePropagation:function(){this.isImmediatePropagationStopped=bb,this.stopPropagation()},isDefaultPrevented:ba,isPropagationStopped:ba,isImmediatePropagationStopped:ba},p.each({mouseenter:"mouseover",mouseleave:"mouseout"},function(a,b){p.event.special[a]={delegateType:b,bindType:b,handle:function(a){var c,d=this,e=a.relatedTarget,f=a.handleObj,g=f.selector;if(!e||e!==d&&!p.contains(d,e))a.type=f.origType,c=f.handler.apply(this,arguments),a.type=b;return c}}}),p.support.submitBubbles||(p.event.special.submit={setup:function(){if(p.nodeName(this,"form"))return!1;p.event.add(this,"click._submit keypress._submit",function(a){var c=a.target,d=p.nodeName(c,"input")||p.nodeName(c,"button")?c.form:b;d&&!p._data(d,"_submit_attached")&&(p.event.add(d,"submit._submit",function(a){a._submit_bubble=!0}),p._data(d,"_submit_attached",!0))})},postDispatch:function(a){a._submit_bubble&&(delete a._submit_bubble,this.parentNode&&!a.isTrigger&&p.event.simulate("submit",this.parentNode,a,!0))},teardown:function(){if(p.nodeName(this,"form"))return!1;p.event.remove(this,"._submit")}}),p.support.changeBubbles||(p.event.special.change={setup:function(){if(V.test(this.nodeName)){if(this.type==="checkbox"||this.type==="radio")p.event.add(this,"propertychange._change",function(a){a.originalEvent.propertyName==="checked"&&(this._just_changed=!0)}),p.event.add(this,"click._change",function(a){this._just_changed&&!a.isTrigger&&(this._just_changed=!1),p.event.simulate("change",this,a,!0)});return!1}p.event.add(this,"beforeactivate._change",function(a){var b=a.target;V.test(b.nodeName)&&!p._data(b,"_change_attached")&&(p.event.add(b,"change._change",function(a){this.parentNode&&!a.isSimulated&&!a.isTrigger&&p.event.simulate("change",this.parentNode,a,!0)}),p._data(b,"_change_attached",!0))})},handle:function(a){var b=a.target;if(this!==b||a.isSimulated||a.isTrigger||b.type!=="radio"&&b.type!=="checkbox")return a.handleObj.handler.apply(this,arguments)},teardown:function(){return p.event.remove(this,"._change"),V.test(this.nodeName)}}),p.support.focusinBubbles||p.each({focus:"focusin",blur:"focusout"},function(a,b){var c=0,d=function(a){p.event.simulate(b,a.target,p.event.fix(a),!0)};p.event.special[b]={setup:function(){c++===0&&e.addEventListener(a,d,!0)},teardown:function(){--c===0&&e.removeEventListener(a,d,!0)}}}),p.fn.extend({on:function(a,c,d,e,f){var g,h;if(typeof a=="object"){typeof c!="string"&&(d=d||c,c=b);for(h in a)this.on(h,c,d,a[h],f);return this}d==null&&e==null?(e=c,d=c=b):e==null&&(typeof c=="string"?(e=d,d=b):(e=d,d=c,c=b));if(e===!1)e=ba;else if(!e)return this;return f===1&&(g=e,e=function(a){return p().off(a),g.apply(this,arguments)},e.guid=g.guid||(g.guid=p.guid++)),this.each(function(){p.event.add(this,a,e,d,c)})},one:function(a,b,c,d){return this.on(a,b,c,d,1)},off:function(a,c,d){var e,f;if(a&&a.preventDefault&&a.handleObj)return e=a.handleObj,p(a.delegateTarget).off(e.namespace?e.origType+"."+e.namespace:e.origType,e.selector,e.handler),this;if(typeof a=="object"){for(f in a)this.off(f,c,a[f]);return this}if(c===!1||typeof c=="function")d=c,c=b;return d===!1&&(d=ba),this.each(function(){p.event.remove(this,a,d,c)})},bind:function(a,b,c){return this.on(a,null,b,c)},unbind:function(a,b){return this.off(a,null,b)},live:function(a,b,c){return p(this.context).on(a,this.selector,b,c),this},die:function(a,b){return p(this.context).off(a,this.selector||"**",b),this},delegate:function(a,b,c,d){return this.on(b,a,c,d)},undelegate:function(a,b,c){return arguments.length==1?this.off(a,"**"):this.off(b,a||"**",c)},trigger:function(a,b){return this.each(function(){p.event.trigger(a,b,this)})},triggerHandler:function(a,b){if(this[0])return p.event.trigger(a,b,this[0],!0)},toggle:function(a){var b=arguments,c=a.guid||p.guid++,d=0,e=function(c){var e=(p._data(this,"lastToggle"+a.guid)||0)%d;return p._data(this,"lastToggle"+a.guid,e+1),c.preventDefault(),b[e].apply(this,arguments)||!1};e.guid=c;while(d<b.length)b[d++].guid=c;return this.click(e)},hover:function(a,b){return this.mouseenter(a).mouseleave(b||a)}}),p.each("blur focus focusin focusout load resize scroll unload click dblclick mousedown mouseup mousemove mouseover mouseout mouseenter mouseleave change select submit keydown keypress keyup error contextmenu".split(" "),function(a,b){p.fn[b]=function(a,c){return c==null&&(c=a,a=null),arguments.length>0?this.on(b,null,a,c):this.trigger(b)},Y.test(b)&&(p.event.fixHooks[b]=p.event.keyHooks),Z.test(b)&&(p.event.fixHooks[b]=p.event.mouseHooks)}),function(a,b){function bd(a,b,c,d){var e=0,f=b.length;for(;e<f;e++)Z(a,b[e],c,d)}function be(a,b,c,d,e,f){var g,h=$.setFilters[b.toLowerCase()];return h||Z.error(b),(a||!(g=e))&&bd(a||"*",d,g=[],e),g.length>0?h(g,c,f):[]}function bf(a,c,d,e,f){var g,h,i,j,k,l,m,n,p=0,q=f.length,s=L.POS,t=new RegExp("^"+s.source+"(?!"+r+")","i"),u=function(){var a=1,c=arguments.length-2;for(;a<c;a++)arguments[a]===b&&(g[a]=b)};for(;p<q;p++){s.exec(""),a=f[p],j=[],i=0,k=e;while(g=s.exec(a)){n=s.lastIndex=g.index+g[0].length;if(n>i){m=a.slice(i,g.index),i=n,l=[c],B.test(m)&&(k&&(l=k),k=e);if(h=H.test(m))m=m.slice(0,-5).replace(B,"$&*");g.length>1&&g[0].replace(t,u),k=be(m,g[1],g[2],l,k,h)}}k?(j=j.concat(k),(m=a.slice(i))&&m!==")"?B.test(m)?bd(m,j,d,e):Z(m,c,d,e?e.concat(k):k):o.apply(d,j)):Z(a,c,d,e)}return q===1?d:Z.uniqueSort(d)}function bg(a,b,c){var d,e,f,g=[],i=0,j=D.exec(a),k=!j.pop()&&!j.pop(),l=k&&a.match(C)||[""],m=$.preFilter,n=$.filter,o=!c&&b!==h;for(;(e=l[i])!=null&&k;i++){g.push(d=[]),o&&(e=" "+e);while(e){k=!1;if(j=B.exec(e))e=e.slice(j[0].length),k=d.push({part:j.pop().replace(A," "),captures:j});for(f in n)(j=L[f].exec(e))&&(!m[f]||(j=m[f](j,b,c)))&&(e=e.slice(j.shift().length),k=d.push({part:f,captures:j}));if(!k)break}}return k||Z.error(a),g}function bh(a,b,e){var f=b.dir,g=m++;return a||(a=function(a){return a===e}),b.first?function(b,c){while(b=b[f])if(b.nodeType===1)return a(b,c)&&b}:function(b,e){var h,i=g+"."+d,j=i+"."+c;while(b=b[f])if(b.nodeType===1){if((h=b[q])===j)return b.sizset;if(typeof h=="string"&&h.indexOf(i)===0){if(b.sizset)return b}else{b[q]=j;if(a(b,e))return b.sizset=!0,b;b.sizset=!1}}}}function bi(a,b){return a?function(c,d){var e=b(c,d);return e&&a(e===!0?c:e,d)}:b}function bj(a,b,c){var d,e,f=0;for(;d=a[f];f++)$.relative[d.part]?e=bh(e,$.relative[d.part],b):(d.captures.push(b,c),e=bi(e,$.filter[d.part].apply(null,d.captures)));return e}function bk(a){return function(b,c){var d,e=0;for(;d=a[e];e++)if(d(b,c))return!0;return!1}}var c,d,e,f,g,h=a.document,i=h.documentElement,j="undefined",k=!1,l=!0,m=0,n=[].slice,o=[].push,q=("sizcache"+Math.random()).replace(".",""),r="[\\x20\\t\\r\\n\\f]",s="(?:\\\\.|[-\\w]|[^\\x00-\\xa0])+",t=s.replace("w","w#"),u="([*^$|!~]?=)",v="\\["+r+"*("+s+")"+r+"*(?:"+u+r+"*(?:(['\"])((?:\\\\.|[^\\\\])*?)\\3|("+t+")|)|)"+r+"*\\]",w=":("+s+")(?:\\((?:(['\"])((?:\\\\.|[^\\\\])*?)\\2|((?:[^,]|\\\\,|(?:,(?=[^\\[]*\\]))|(?:,(?=[^\\(]*\\))))*))\\)|)",x=":(nth|eq|gt|lt|first|last|even|odd)(?:\\((\\d*)\\)|)(?=[^-]|$)",y=r+"*([\\x20\\t\\r\\n\\f>+~])"+r+"*",z="(?=[^\\x20\\t\\r\\n\\f])(?:\\\\.|"+v+"|"+w.replace(2,7)+"|[^\\\\(),])+",A=new RegExp("^"+r+"+|((?:^|[^\\\\])(?:\\\\.)*)"+r+"+$","g"),B=new RegExp("^"+y),C=new RegExp(z+"?(?="+r+"*,|$)","g"),D=new RegExp("^(?:(?!,)(?:(?:^|,)"+r+"*"+z+")*?|"+r+"*(.*?))(\\)|$)"),E=new RegExp(z.slice(19,-6)+"\\x20\\t\\r\\n\\f>+~])+|"+y,"g"),F=/^(?:#([\w\-]+)|(\w+)|\.([\w\-]+))$/,G=/[\x20\t\r\n\f]*[+~]/,H=/:not\($/,I=/h\d/i,J=/input|select|textarea|button/i,K=/\\(?!\\)/g,L={ID:new RegExp("^#("+s+")"),CLASS:new RegExp("^\\.("+s+")"),NAME:new RegExp("^\\[name=['\"]?("+s+")['\"]?\\]"),TAG:new RegExp("^("+s.replace("[-","[-\\*")+")"),ATTR:new RegExp("^"+v),PSEUDO:new RegExp("^"+w),CHILD:new RegExp("^:(only|nth|last|first)-child(?:\\("+r+"*(even|odd|(([+-]|)(\\d*)n|)"+r+"*(?:([+-]|)"+r+"*(\\d+)|))"+r+"*\\)|)","i"),POS:new RegExp(x,"ig"),needsContext:new RegExp("^"+r+"*[>+~]|"+x,"i")},M={},N=[],O={},P=[],Q=function(a){return a.sizzleFilter=!0,a},R=function(a){return function(b){return b.nodeName.toLowerCase()==="input"&&b.type===a}},S=function(a){return function(b){var c=b.nodeName.toLowerCase();return(c==="input"||c==="button")&&b.type===a}},T=function(a){var b=!1,c=h.createElement("div");try{b=a(c)}catch(d){}return c=null,b},U=T(function(a){a.innerHTML="<select></select>";var b=typeof a.lastChild.getAttribute("multiple");return b!=="boolean"&&b!=="string"}),V=T(function(a){a.id=q+0,a.innerHTML="<a name='"+q+"'></a><div name='"+q+"'></div>",i.insertBefore(a,i.firstChild);var b=h.getElementsByName&&h.getElementsByName(q).length===2+h.getElementsByName(q+0).length;return g=!h.getElementById(q),i.removeChild(a),b}),W=T(function(a){return a.appendChild(h.createComment("")),a.getElementsByTagName("*").length===0}),X=T(function(a){return a.innerHTML="<a href='#'></a>",a.firstChild&&typeof a.firstChild.getAttribute!==j&&a.firstChild.getAttribute("href")==="#"}),Y=T(function(a){return a.innerHTML="<div class='hidden e'></div><div class='hidden'></div>",!a.getElementsByClassName||a.getElementsByClassName("e").length===0?!1:(a.lastChild.className="e",a.getElementsByClassName("e").length!==1)}),Z=function(a,b,c,d){c=c||[],b=b||h;var e,f,g,i,j=b.nodeType;if(j!==1&&j!==9)return[];if(!a||typeof a!="string")return c;g=ba(b);if(!g&&!d)if(e=F.exec(a))if(i=e[1]){if(j===9){f=b.getElementById(i);if(!f||!f.parentNode)return c;if(f.id===i)return c.push(f),c}else if(b.ownerDocument&&(f=b.ownerDocument.getElementById(i))&&bb(b,f)&&f.id===i)return c.push(f),c}else{if(e[2])return o.apply(c,n.call(b.getElementsByTagName(a),0)),c;if((i=e[3])&&Y&&b.getElementsByClassName)return o.apply(c,n.call(b.getElementsByClassName(i),0)),c}return bm(a,b,c,d,g)},$=Z.selectors={cacheLength:50,match:L,order:["ID","TAG"],attrHandle:{},createPseudo:Q,find:{ID:g?function(a,b,c){if(typeof b.getElementById!==j&&!c){var d=b.getElementById(a);return d&&d.parentNode?[d]:[]}}:function(a,c,d){if(typeof c.getElementById!==j&&!d){var e=c.getElementById(a);return e?e.id===a||typeof e.getAttributeNode!==j&&e.getAttributeNode("id").value===a?[e]:b:[]}},TAG:W?function(a,b){if(typeof b.getElementsByTagName!==j)return b.getElementsByTagName(a)}:function(a,b){var c=b.getElementsByTagName(a);if(a==="*"){var d,e=[],f=0;for(;d=c[f];f++)d.nodeType===1&&e.push(d);return e}return c}},relative:{">":{dir:"parentNode",first:!0}," ":{dir:"parentNode"},"+":{dir:"previousSibling",first:!0},"~":{dir:"previousSibling"}},preFilter:{ATTR:function(a){return a[1]=a[1].replace(K,""),a[3]=(a[4]||a[5]||"").replace(K,""),a[2]==="~="&&(a[3]=" "+a[3]+" "),a.slice(0,4)},CHILD:function(a){return a[1]=a[1].toLowerCase(),a[1]==="nth"?(a[2]||Z.error(a[0]),a[3]=+(a[3]?a[4]+(a[5]||1):2*(a[2]==="even"||a[2]==="odd")),a[4]=+(a[6]+a[7]||a[2]==="odd")):a[2]&&Z.error(a[0]),a},PSEUDO:function(a){var b,c=a[4];return L.CHILD.test(a[0])?null:(c&&(b=D.exec(c))&&b.pop()&&(a[0]=a[0].slice(0,b[0].length-c.length-1),c=b[0].slice(0,-1)),a.splice(2,3,c||a[3]),a)}},filter:{ID:g?function(a){return a=a.replace(K,""),function(b){return b.getAttribute("id")===a}}:function(a){return a=a.replace(K,""),function(b){var c=typeof b.getAttributeNode!==j&&b.getAttributeNode("id");return c&&c.value===a}},TAG:function(a){return a==="*"?function(){return!0}:(a=a.replace(K,"").toLowerCase(),function(b){return b.nodeName&&b.nodeName.toLowerCase()===a})},CLASS:function(a){var b=M[a];return b||(b=M[a]=new RegExp("(^|"+r+")"+a+"("+r+"|$)"),N.push(a),N.length>$.cacheLength&&delete M[N.shift()]),function(a){return b.test(a.className||typeof a.getAttribute!==j&&a.getAttribute("class")||"")}},ATTR:function(a,b,c){return b?function(d){var e=Z.attr(d,a),f=e+"";if(e==null)return b==="!=";switch(b){case"=":return f===c;case"!=":return f!==c;case"^=":return c&&f.indexOf(c)===0;case"*=":return c&&f.indexOf(c)>-1;case"$=":return c&&f.substr(f.length-c.length)===c;case"~=":return(" "+f+" ").indexOf(c)>-1;case"|=":return f===c||f.substr(0,c.length+1)===c+"-"}}:function(b){return Z.attr(b,a)!=null}},CHILD:function(a,b,c,d){if(a==="nth"){var e=m++;return function(a){var b,f,g=0,h=a;if(c===1&&d===0)return!0;b=a.parentNode;if(b&&(b[q]!==e||!a.sizset)){for(h=b.firstChild;h;h=h.nextSibling)if(h.nodeType===1){h.sizset=++g;if(h===a)break}b[q]=e}return f=a.sizset-d,c===0?f===0:f%c===0&&f/c>=0}}return function(b){var c=b;switch(a){case"only":case"first":while(c=c.previousSibling)if(c.nodeType===1)return!1;if(a==="first")return!0;c=b;case"last":while(c=c.nextSibling)if(c.nodeType===1)return!1;return!0}}},PSEUDO:function(a,b,c,d){var e=$.pseudos[a]||$.pseudos[a.toLowerCase()];return e||Z.error("unsupported pseudo: "+a),e.sizzleFilter?e(b,c,d):e}},pseudos:{not:Q(function(a,b,c){var d=bl(a.replace(A,"$1"),b,c);return function(a){return!d(a)}}),enabled:function(a){return a.disabled===!1},disabled:function(a){return a.disabled===!0},checked:function(a){var b=a.nodeName.toLowerCase();return b==="input"&&!!a.checked||b==="option"&&!!a.selected},selected:function(a){return a.parentNode&&a.parentNode.selectedIndex,a.selected===!0},parent:function(a){return!$.pseudos.empty(a)},empty:function(a){var b;a=a.firstChild;while(a){if(a.nodeName>"@"||(b=a.nodeType)===3||b===4)return!1;a=a.nextSibling}return!0},contains:Q(function(a){return function(b){return(b.textContent||b.innerText||bc(b)).indexOf(a)>-1}}),has:Q(function(a){return function(b){return Z(a,b).length>0}}),header:function(a){return I.test(a.nodeName)},text:function(a){var b,c;return a.nodeName.toLowerCase()==="input"&&(b=a.type)==="text"&&((c=a.getAttribute("type"))==null||c.toLowerCase()===b)},radio:R("radio"),checkbox:R("checkbox"),file:R("file"),password:R("password"),image:R("image"),submit:S("submit"),reset:S("reset"),button:function(a){var b=a.nodeName.toLowerCase();return b==="input"&&a.type==="button"||b==="button"},input:function(a){return J.test(a.nodeName)},focus:function(a){var b=a.ownerDocument;return a===b.activeElement&&(!b.hasFocus||b.hasFocus())&&(!!a.type||!!a.href)},active:function(a){return a===a.ownerDocument.activeElement}},setFilters:{first:function(a,b,c){return c?a.slice(1):[a[0]]},last:function(a,b,c){var d=a.pop();return c?a:[d]},even:function(a,b,c){var d=[],e=c?1:0,f=a.length;for(;e<f;e=e+2)d.push(a[e]);return d},odd:function(a,b,c){var d=[],e=c?0:1,f=a.length;for(;e<f;e=e+2)d.push(a[e]);return d},lt:function(a,b,c){return c?a.slice(+b):a.slice(0,+b)},gt:function(a,b,c){return c?a.slice(0,+b+1):a.slice(+b+1)},eq:function(a,b,c){var d=a.splice(+b,1);return c?a:d}}};$.setFilters.nth=$.setFilters.eq,$.filters=$.pseudos,X||($.attrHandle={href:function(a){return a.getAttribute("href",2)},type:function(a){return a.getAttribute("type")}}),V&&($.order.push("NAME"),$.find.NAME=function(a,b){if(typeof b.getElementsByName!==j)return b.getElementsByName(a)}),Y&&($.order.splice(1,0,"CLASS"),$.find.CLASS=function(a,b,c){if(typeof b.getElementsByClassName!==j&&!c)return b.getElementsByClassName(a)});try{n.call(i.childNodes,0)[0].nodeType}catch(_){n=function(a){var b,c=[];for(;b=this[a];a++)c.push(b);return c}}var ba=Z.isXML=function(a){var b=a&&(a.ownerDocument||a).documentElement;return b?b.nodeName!=="HTML":!1},bb=Z.contains=i.compareDocumentPosition?function(a,b){return!!(a.compareDocumentPosition(b)&16)}:i.contains?function(a,b){var c=a.nodeType===9?a.documentElement:a,d=b.parentNode;return a===d||!!(d&&d.nodeType===1&&c.contains&&c.contains(d))}:function(a,b){while(b=b.parentNode)if(b===a)return!0;return!1},bc=Z.getText=function(a){var b,c="",d=0,e=a.nodeType;if(e){if(e===1||e===9||e===11){if(typeof a.textContent=="string")return a.textContent;for(a=a.firstChild;a;a=a.nextSibling)c+=bc(a)}else if(e===3||e===4)return a.nodeValue}else for(;b=a[d];d++)c+=bc(b);return c};Z.attr=function(a,b){var c,d=ba(a);return d||(b=b.toLowerCase()),$.attrHandle[b]?$.attrHandle[b](a):U||d?a.getAttribute(b):(c=a.getAttributeNode(b),c?typeof a[b]=="boolean"?a[b]?b:null:c.specified?c.value:null:null)},Z.error=function(a){throw new Error("Syntax error, unrecognized expression: "+a)},[0,0].sort(function(){return l=0}),i.compareDocumentPosition?e=function(a,b){return a===b?(k=!0,0):(!a.compareDocumentPosition||!b.compareDocumentPosition?a.compareDocumentPosition:a.compareDocumentPosition(b)&4)?-1:1}:(e=function(a,b){if(a===b)return k=!0,0;if(a.sourceIndex&&b.sourceIndex)return a.sourceIndex-b.sourceIndex;var c,d,e=[],g=[],h=a.parentNode,i=b.parentNode,j=h;if(h===i)return f(a,b);if(!h)return-1;if(!i)return 1;while(j)e.unshift(j),j=j.parentNode;j=i;while(j)g.unshift(j),j=j.parentNode;c=e.length,d=g.length;for(var l=0;l<c&&l<d;l++)if(e[l]!==g[l])return f(e[l],g[l]);return l===c?f(a,g[l],-1):f(e[l],b,1)},f=function(a,b,c){if(a===b)return c;var d=a.nextSibling;while(d){if(d===b)return-1;d=d.nextSibling}return 1}),Z.uniqueSort=function(a){var b,c=1;if(e){k=l,a.sort(e);if(k)for(;b=a[c];c++)b===a[c-1]&&a.splice(c--,1)}return a};var bl=Z.compile=function(a,b,c){var d,e,f,g=O[a];if(g&&g.context===b)return g;e=bg(a,b,c);for(f=0;d=e[f];f++)e[f]=bj(d,b,c);return g=O[a]=bk(e),g.context=b,g.runs=g.dirruns=0,P.push(a),P.length>$.cacheLength&&delete O[P.shift()],g};Z.matches=function(a,b){return Z(a,null,null,b)},Z.matchesSelector=function(a,b){return Z(b,null,null,[a]).length>0};var bm=function(a,b,e,f,g){a=a.replace(A,"$1");var h,i,j,k,l,m,p,q,r,s=a.match(C),t=a.match(E),u=b.nodeType;if(L.POS.test(a))return bf(a,b,e,f,s);if(f)h=n.call(f,0);else if(s&&s.length===1){if(t.length>1&&u===9&&!g&&(s=L.ID.exec(t[0]))){b=$.find.ID(s[1],b,g)[0];if(!b)return e;a=a.slice(t.shift().length)}q=(s=G.exec(t[0]))&&!s.index&&b.parentNode||b,r=t.pop(),m=r.split(":not")[0];for(j=0,k=$.order.length;j<k;j++){p=$.order[j];if(s=L[p].exec(m)){h=$.find[p]((s[1]||"").replace(K,""),q,g);if(h==null)continue;m===r&&(a=a.slice(0,a.length-r.length)+m.replace(L[p],""),a||o.apply(e,n.call(h,0)));break}}}if(a){i=bl(a,b,g),d=i.dirruns++,h==null&&(h=$.find.TAG("*",G.test(a)&&b.parentNode||b));for(j=0;l=h[j];j++)c=i.runs++,i(l,b)&&e.push(l)}return e};h.querySelectorAll&&function(){var a,b=bm,c=/'|\\/g,d=/\=[\x20\t\r\n\f]*([^'"\]]*)[\x20\t\r\n\f]*\]/g,e=[],f=[":active"],g=i.matchesSelector||i.mozMatchesSelector||i.webkitMatchesSelector||i.oMatchesSelector||i.msMatchesSelector;T(function(a){a.innerHTML="<select><option selected></option></select>",a.querySelectorAll("[selected]").length||e.push("\\["+r+"*(?:checked|disabled|ismap|multiple|readonly|selected|value)"),a.querySelectorAll(":checked").length||e.push(":checked")}),T(function(a){a.innerHTML="<p test=''></p>",a.querySelectorAll("[test^='']").length&&e.push("[*^$]="+r+"*(?:\"\"|'')"),a.innerHTML="<input type='hidden'>",a.querySelectorAll(":enabled").length||e.push(":enabled",":disabled")}),e=e.length&&new RegExp(e.join("|")),bm=function(a,d,f,g,h){if(!g&&!h&&(!e||!e.test(a)))if(d.nodeType===9)try{return o.apply(f,n.call(d.querySelectorAll(a),0)),f}catch(i){}else if(d.nodeType===1&&d.nodeName.toLowerCase()!=="object"){var j=d.getAttribute("id"),k=j||q,l=G.test(a)&&d.parentNode||d;j?k=k.replace(c,"\\$&"):d.setAttribute("id",k);try{return o.apply(f,n.call(l.querySelectorAll(a.replace(C,"[id='"+k+"'] $&")),0)),f}catch(i){}finally{j||d.removeAttribute("id")}}return b(a,d,f,g,h)},g&&(T(function(b){a=g.call(b,"div");try{g.call(b,"[test!='']:sizzle"),f.push($.match.PSEUDO)}catch(c){}}),f=new RegExp(f.join("|")),Z.matchesSelector=function(b,c){c=c.replace(d,"='$1']");if(!ba(b)&&!f.test(c)&&(!e||!e.test(c)))try{var h=g.call(b,c);if(h||a||b.document&&b.document.nodeType!==11)return h}catch(i){}return Z(c,null,null,[b]).length>0})}(),Z.attr=p.attr,p.find=Z,p.expr=Z.selectors,p.expr[":"]=p.expr.pseudos,p.unique=Z.uniqueSort,p.text=Z.getText,p.isXMLDoc=Z.isXML,p.contains=Z.contains}(a);var bc=/Until$/,bd=/^(?:parents|prev(?:Until|All))/,be=/^.[^:#\[\.,]*$/,bf=p.expr.match.needsContext,bg={children:!0,contents:!0,next:!0,prev:!0};p.fn.extend({find:function(a){var b,c,d,e,f,g,h=this;if(typeof a!="string")return p(a).filter(function(){for(b=0,c=h.length;b<c;b++)if(p.contains(h[b],this))return!0});g=this.pushStack("","find",a);for(b=0,c=this.length;b<c;b++){d=g.length,p.find(a,this[b],g);if(b>0)for(e=d;e<g.length;e++)for(f=0;f<d;f++)if(g[f]===g[e]){g.splice(e--,1);break}}return g},has:function(a){var b,c=p(a,this),d=c.length;return this.filter(function(){for(b=0;b<d;b++)if(p.contains(this,c[b]))return!0})},not:function(a){return this.pushStack(bj(this,a,!1),"not",a)},filter:function(a){return this.pushStack(bj(this,a,!0),"filter",a)},is:function(a){return!!a&&(typeof a=="string"?bf.test(a)?p(a,this.context).index(this[0])>=0:p.filter(a,this).length>0:this.filter(a).length>0)},closest:function(a,b){var c,d=0,e=this.length,f=[],g=bf.test(a)||typeof a!="string"?p(a,b||this.context):0;for(;d<e;d++){c=this[d];while(c&&c.ownerDocument&&c!==b&&c.nodeType!==11){if(g?g.index(c)>-1:p.find.matchesSelector(c,a)){f.push(c);break}c=c.parentNode}}return f=f.length>1?p.unique(f):f,this.pushStack(f,"closest",a)},index:function(a){return a?typeof a=="string"?p.inArray(this[0],p(a)):p.inArray(a.jquery?a[0]:a,this):this[0]&&this[0].parentNode?this.prevAll().length:-1},add:function(a,b){var c=typeof a=="string"?p(a,b):p.makeArray(a&&a.nodeType?[a]:a),d=p.merge(this.get(),c);return this.pushStack(bh(c[0])||bh(d[0])?d:p.unique(d))},addBack:function(a){return this.add(a==null?this.prevObject:this.prevObject.filter(a))}}),p.fn.andSelf=p.fn.addBack,p.each({parent:function(a){var b=a.parentNode;return b&&b.nodeType!==11?b:null},parents:function(a){return p.dir(a,"parentNode")},parentsUntil:function(a,b,c){return p.dir(a,"parentNode",c)},next:function(a){return bi(a,"nextSibling")},prev:function(a){return bi(a,"previousSibling")},nextAll:function(a){return p.dir(a,"nextSibling")},prevAll:function(a){return p.dir(a,"previousSibling")},nextUntil:function(a,b,c){return p.dir(a,"nextSibling",c)},prevUntil:function(a,b,c){return p.dir(a,"previousSibling",c)},siblings:function(a){return p.sibling((a.parentNode||{}).firstChild,a)},children:function(a){return p.sibling(a.firstChild)},contents:function(a){return p.nodeName(a,"iframe")?a.contentDocument||a.contentWindow.document:p.merge([],a.childNodes)}},function(a,b){p.fn[a]=function(c,d){var e=p.map(this,b,c);return bc.test(a)||(d=c),d&&typeof d=="string"&&(e=p.filter(d,e)),e=this.length>1&&!bg[a]?p.unique(e):e,this.length>1&&bd.test(a)&&(e=e.reverse()),this.pushStack(e,a,k.call(arguments).join(","))}}),p.extend({filter:function(a,b,c){return c&&(a=":not("+a+")"),b.length===1?p.find.matchesSelector(b[0],a)?[b[0]]:[]:p.find.matches(a,b)},dir:function(a,c,d){var e=[],f=a[c];while(f&&f.nodeType!==9&&(d===b||f.nodeType!==1||!p(f).is(d)))f.nodeType===1&&e.push(f),f=f[c];return e},sibling:function(a,b){var c=[];for(;a;a=a.nextSibling)a.nodeType===1&&a!==b&&c.push(a);return c}});var bl="abbr|article|aside|audio|bdi|canvas|data|datalist|details|figcaption|figure|footer|header|hgroup|mark|meter|nav|output|progress|section|summary|time|video",bm=/ jQuery\d+="(?:null|\d+)"/g,bn=/^\s+/,bo=/<(?!area|br|col|embed|hr|img|input|link|meta|param)(([\w:]+)[^>]*)\/>/gi,bp=/<([\w:]+)/,bq=/<tbody/i,br=/<|&#?\w+;/,bs=/<(?:script|style|link)/i,bt=/<(?:script|object|embed|option|style)/i,bu=new RegExp("<(?:"+bl+")[\\s/>]","i"),bv=/^(?:checkbox|radio)$/,bw=/checked\s*(?:[^=]|=\s*.checked.)/i,bx=/\/(java|ecma)script/i,by=/^\s*<!(?:\[CDATA\[|\-\-)|[\]\-]{2}>\s*$/g,bz={option:[1,"<select multiple='multiple'>","</select>"],legend:[1,"<fieldset>","</fieldset>"],thead:[1,"<table>","</table>"],tr:[2,"<table><tbody>","</tbody></table>"],td:[3,"<table><tbody><tr>","</tr></tbody></table>"],col:[2,"<table><tbody></tbody><colgroup>","</colgroup></table>"],area:[1,"<map>","</map>"],_default:[0,"",""]},bA=bk(e),bB=bA.appendChild(e.createElement("div"));bz.optgroup=bz.option,bz.tbody=bz.tfoot=bz.colgroup=bz.caption=bz.thead,bz.th=bz.td,p.support.htmlSerialize||(bz._default=[1,"X<div>","</div>"]),p.fn.extend({text:function(a){return p.access(this,function(a){return a===b?p.text(this):this.empty().append((this[0]&&this[0].ownerDocument||e).createTextNode(a))},null,a,arguments.length)},wrapAll:function(a){if(p.isFunction(a))return this.each(function(b){p(this).wrapAll(a.call(this,b))});if(this[0]){var b=p(a,this[0].ownerDocument).eq(0).clone(!0);this[0].parentNode&&b.insertBefore(this[0]),b.map(function(){var a=this;while(a.firstChild&&a.firstChild.nodeType===1)a=a.firstChild;return a}).append(this)}return this},wrapInner:function(a){return p.isFunction(a)?this.each(function(b){p(this).wrapInner(a.call(this,b))}):this.each(function(){var b=p(this),c=b.contents();c.length?c.wrapAll(a):b.append(a)})},wrap:function(a){var b=p.isFunction(a);return this.each(function(c){p(this).wrapAll(b?a.call(this,c):a)})},unwrap:function(){return this.parent().each(function(){p.nodeName(this,"body")||p(this).replaceWith(this.childNodes)}).end()},append:function(){return this.domManip(arguments,!0,function(a){(this.nodeType===1||this.nodeType===11)&&this.appendChild(a)})},prepend:function(){return this.domManip(arguments,!0,function(a){(this.nodeType===1||this.nodeType===11)&&this.insertBefore(a,this.firstChild)})},before:function(){if(!bh(this[0]))return this.domManip(arguments,!1,function(a){this.parentNode.insertBefore(a,this)});if(arguments.length){var a=p.clean(arguments);return this.pushStack(p.merge(a,this),"before",this.selector)}},after:function(){if(!bh(this[0]))return this.domManip(arguments,!1,function(a){this.parentNode.insertBefore(a,this.nextSibling)});if(arguments.length){var a=p.clean(arguments);return this.pushStack(p.merge(this,a),"after",this.selector)}},remove:function(a,b){var c,d=0;for(;(c=this[d])!=null;d++)if(!a||p.filter(a,[c]).length)!b&&c.nodeType===1&&(p.cleanData(c.getElementsByTagName("*")),p.cleanData([c])),c.parentNode&&c.parentNode.removeChild(c);return this},empty:function(){var a,b=0;for(;(a=this[b])!=null;b++){a.nodeType===1&&p.cleanData(a.getElementsByTagName("*"));while(a.firstChild)a.removeChild(a.firstChild)}return this},clone:function(a,b){return a=a==null?!1:a,b=b==null?a:b,this.map(function(){return p.clone(this,a,b)})},html:function(a){return p.access(this,function(a){var c=this[0]||{},d=0,e=this.length;if(a===b)return c.nodeType===1?c.innerHTML.replace(bm,""):b;if(typeof a=="string"&&!bs.test(a)&&(p.support.htmlSerialize||!bu.test(a))&&(p.support.leadingWhitespace||!bn.test(a))&&!bz[(bp.exec(a)||["",""])[1].toLowerCase()]){a=a.replace(bo,"<$1></$2>");try{for(;d<e;d++)c=this[d]||{},c.nodeType===1&&(p.cleanData(c.getElementsByTagName("*")),c.innerHTML=a);c=0}catch(f){}}c&&this.empty().append(a)},null,a,arguments.length)},replaceWith:function(a){return bh(this[0])?this.length?this.pushStack(p(p.isFunction(a)?a():a),"replaceWith",a):this:p.isFunction(a)?this.each(function(b){var c=p(this),d=c.html();c.replaceWith(a.call(this,b,d))}):(typeof a!="string"&&(a=p(a).detach()),this.each(function(){var b=this.nextSibling,c=this.parentNode;p(this).remove(),b?p(b).before(a):p(c).append(a)}))},detach:function(a){return this.remove(a,!0)},domManip:function(a,c,d){a=[].concat.apply([],a);var e,f,g,h,i=0,j=a[0],k=[],l=this.length;if(!p.support.checkClone&&l>1&&typeof j=="string"&&bw.test(j))return this.each(function(){p(this).domManip(a,c,d)});if(p.isFunction(j))return this.each(function(e){var f=p(this);a[0]=j.call(this,e,c?f.html():b),f.domManip(a,c,d)});if(this[0]){e=p.buildFragment(a,this,k),g=e.fragment,f=g.firstChild,g.childNodes.length===1&&(g=f);if(f){c=c&&p.nodeName(f,"tr");for(h=e.cacheable||l-1;i<l;i++)d.call(c&&p.nodeName(this[i],"table")?bC(this[i],"tbody"):this[i],i===h?g:p.clone(g,!0,!0))}g=f=null,k.length&&p.each(k,function(a,b){b.src?p.ajax?p.ajax({url:b.src,type:"GET",dataType:"script",async:!1,global:!1,"throws":!0}):p.error("no ajax"):p.globalEval((b.text||b.textContent||b.innerHTML||"").replace(by,"")),b.parentNode&&b.parentNode.removeChild(b)})}return this}}),p.buildFragment=function(a,c,d){var f,g,h,i=a[0];return c=c||e,c=(c[0]||c).ownerDocument||c[0]||c,typeof c.createDocumentFragment=="undefined"&&(c=e),a.length===1&&typeof i=="string"&&i.length<512&&c===e&&i.charAt(0)==="<"&&!bt.test(i)&&(p.support.checkClone||!bw.test(i))&&(p.support.html5Clone||!bu.test(i))&&(g=!0,f=p.fragments[i],h=f!==b),f||(f=c.createDocumentFragment(),p.clean(a,c,f,d),g&&(p.fragments[i]=h&&f)),{fragment:f,cacheable:g}},p.fragments={},p.each({appendTo:"append",prependTo:"prepend",insertBefore:"before",insertAfter:"after",replaceAll:"replaceWith"},function(a,b){p.fn[a]=function(c){var d,e=0,f=[],g=p(c),h=g.length,i=this.length===1&&this[0].parentNode;if((i==null||i&&i.nodeType===11&&i.childNodes.length===1)&&h===1)return g[b](this[0]),this;for(;e<h;e++)d=(e>0?this.clone(!0):this).get(),p(g[e])[b](d),f=f.concat(d);return this.pushStack(f,a,g.selector)}}),p.extend({clone:function(a,b,c){var d,e,f,g;p.support.html5Clone||p.isXMLDoc(a)||!bu.test("<"+a.nodeName+">")?g=a.cloneNode(!0):(bB.innerHTML=a.outerHTML,bB.removeChild(g=bB.firstChild));if((!p.support.noCloneEvent||!p.support.noCloneChecked)&&(a.nodeType===1||a.nodeType===11)&&!p.isXMLDoc(a)){bE(a,g),d=bF(a),e=bF(g);for(f=0;d[f];++f)e[f]&&bE(d[f],e[f])}if(b){bD(a,g);if(c){d=bF(a),e=bF(g);for(f=0;d[f];++f)bD(d[f],e[f])}}return d=e=null,g},clean:function(a,b,c,d){var f,g,h,i,j,k,l,m,n,o,q,r,s=0,t=[];if(!b||typeof b.createDocumentFragment=="undefined")b=e;for(g=b===e&&bA;(h=a[s])!=null;s++){typeof h=="number"&&(h+="");if(!h)continue;if(typeof h=="string")if(!br.test(h))h=b.createTextNode(h);else{g=g||bk(b),l=l||g.appendChild(b.createElement("div")),h=h.replace(bo,"<$1></$2>"),i=(bp.exec(h)||["",""])[1].toLowerCase(),j=bz[i]||bz._default,k=j[0],l.innerHTML=j[1]+h+j[2];while(k--)l=l.lastChild;if(!p.support.tbody){m=bq.test(h),n=i==="table"&&!m?l.firstChild&&l.firstChild.childNodes:j[1]==="<table>"&&!m?l.childNodes:[];for(f=n.length-1;f>=0;--f)p.nodeName(n[f],"tbody")&&!n[f].childNodes.length&&n[f].parentNode.removeChild(n[f])}!p.support.leadingWhitespace&&bn.test(h)&&l.insertBefore(b.createTextNode(bn.exec(h)[0]),l.firstChild),h=l.childNodes,l=g.lastChild}h.nodeType?t.push(h):t=p.merge(t,h)}l&&(g.removeChild(l),h=l=g=null);if(!p.support.appendChecked)for(s=0;(h=t[s])!=null;s++)p.nodeName(h,"input")?bG(h):typeof h.getElementsByTagName!="undefined"&&p.grep(h.getElementsByTagName("input"),bG);if(c){q=function(a){if(!a.type||bx.test(a.type))return d?d.push(a.parentNode?a.parentNode.removeChild(a):a):c.appendChild(a)};for(s=0;(h=t[s])!=null;s++)if(!p.nodeName(h,"script")||!q(h))c.appendChild(h),typeof h.getElementsByTagName!="undefined"&&(r=p.grep(p.merge([],h.getElementsByTagName("script")),q),t.splice.apply(t,[s+1,0].concat(r)),s+=r.length)}return t},cleanData:function(a,b){var c,d,e,f,g=0,h=p.expando,i=p.cache,j=p.support.deleteExpando,k=p.event.special;for(;(e=a[g])!=null;g++)if(b||p.acceptData(e)){d=e[h],c=d&&i[d];if(c){if(c.events)for(f in c.events)k[f]?p.event.remove(e,f):p.removeEvent(e,f,c.handle);i[d]&&(delete i[d],j?delete e[h]:e.removeAttribute?e.removeAttribute(h):e[h]=null,p.deletedIds.push(d))}}}}),function(){var a,b;p.uaMatch=function(a){a=a.toLowerCase();var b=/(chrome)[ \/]([\w.]+)/.exec(a)||/(webkit)[ \/]([\w.]+)/.exec(a)||/(opera)(?:.*version|)[ \/]([\w.]+)/.exec(a)||/(msie) ([\w.]+)/.exec(a)||a.indexOf("compatible")<0&&/(mozilla)(?:.*? rv:([\w.]+)|)/.exec(a)||[];return{browser:b[1]||"",version:b[2]||"0"}},a=p.uaMatch(g.userAgent),b={},a.browser&&(b[a.browser]=!0,b.version=a.version),b.webkit&&(b.safari=!0),p.browser=b,p.sub=function(){function a(b,c){return new a.fn.init(b,c)}p.extend(!0,a,this),a.superclass=this,a.fn=a.prototype=this(),a.fn.constructor=a,a.sub=this.sub,a.fn.init=function c(c,d){return d&&d instanceof p&&!(d instanceof a)&&(d=a(d)),p.fn.init.call(this,c,d,b)},a.fn.init.prototype=a.fn;var b=a(e);return a}}();var bH,bI,bJ,bK=/alpha\([^)]*\)/i,bL=/opacity=([^)]*)/,bM=/^(top|right|bottom|left)$/,bN=/^margin/,bO=new RegExp("^("+q+")(.*)$","i"),bP=new RegExp("^("+q+")(?!px)[a-z%]+$","i"),bQ=new RegExp("^([-+])=("+q+")","i"),bR={},bS={position:"absolute",visibility:"hidden",display:"block"},bT={letterSpacing:0,fontWeight:400,lineHeight:1},bU=["Top","Right","Bottom","Left"],bV=["Webkit","O","Moz","ms"],bW=p.fn.toggle;p.fn.extend({css:function(a,c){return p.access(this,function(a,c,d){return d!==b?p.style(a,c,d):p.css(a,c)},a,c,arguments.length>1)},show:function(){return bZ(this,!0)},hide:function(){return bZ(this)},toggle:function(a,b){var c=typeof a=="boolean";return p.isFunction(a)&&p.isFunction(b)?bW.apply(this,arguments):this.each(function(){(c?a:bY(this))?p(this).show():p(this).hide()})}}),p.extend({cssHooks:{opacity:{get:function(a,b){if(b){var c=bH(a,"opacity");return c===""?"1":c}}}},cssNumber:{fillOpacity:!0,fontWeight:!0,lineHeight:!0,opacity:!0,orphans:!0,widows:!0,zIndex:!0,zoom:!0},cssProps:{"float":p.support.cssFloat?"cssFloat":"styleFloat"},style:function(a,c,d,e){if(!a||a.nodeType===3||a.nodeType===8||!a.style)return;var f,g,h,i=p.camelCase(c),j=a.style;c=p.cssProps[i]||(p.cssProps[i]=bX(j,i)),h=p.cssHooks[c]||p.cssHooks[i];if(d===b)return h&&"get"in h&&(f=h.get(a,!1,e))!==b?f:j[c];g=typeof d,g==="string"&&(f=bQ.exec(d))&&(d=(f[1]+1)*f[2]+parseFloat(p.css(a,c)),g="number");if(d==null||g==="number"&&isNaN(d))return;g==="number"&&!p.cssNumber[i]&&(d+="px");if(!h||!("set"in h)||(d=h.set(a,d,e))!==b)try{j[c]=d}catch(k){}},css:function(a,c,d,e){var f,g,h,i=p.camelCase(c);return c=p.cssProps[i]||(p.cssProps[i]=bX(a.style,i)),h=p.cssHooks[c]||p.cssHooks[i],h&&"get"in h&&(f=h.get(a,!0,e)),f===b&&(f=bH(a,c)),f==="normal"&&c in bT&&(f=bT[c]),d||e!==b?(g=parseFloat(f),d||p.isNumeric(g)?g||0:f):f},swap:function(a,b,c){var d,e,f={};for(e in b)f[e]=a.style[e],a.style[e]=b[e];d=c.call(a);for(e in b)a.style[e]=f[e];return d}}),a.getComputedStyle?bH=function(a,b){var c,d,e,f,g=getComputedStyle(a,null),h=a.style;return g&&(c=g[b],c===""&&!p.contains(a.ownerDocument.documentElement,a)&&(c=p.style(a,b)),bP.test(c)&&bN.test(b)&&(d=h.width,e=h.minWidth,f=h.maxWidth,h.minWidth=h.maxWidth=h.width=c,c=g.width,h.width=d,h.minWidth=e,h.maxWidth=f)),c}:e.documentElement.currentStyle&&(bH=function(a,b){var c,d,e=a.currentStyle&&a.currentStyle[b],f=a.style;return e==null&&f&&f[b]&&(e=f[b]),bP.test(e)&&!bM.test(b)&&(c=f.left,d=a.runtimeStyle&&a.runtimeStyle.left,d&&(a.runtimeStyle.left=a.currentStyle.left),f.left=b==="fontSize"?"1em":e,e=f.pixelLeft+"px",f.left=c,d&&(a.runtimeStyle.left=d)),e===""?"auto":e}),p.each(["height","width"],function(a,b){p.cssHooks[b]={get:function(a,c,d){if(c)return a.offsetWidth!==0||bH(a,"display")!=="none"?ca(a,b,d):p.swap(a,bS,function(){return ca(a,b,d)})},set:function(a,c,d){return b$(a,c,d?b_(a,b,d,p.support.boxSizing&&p.css(a,"boxSizing")==="border-box"):0)}}}),p.support.opacity||(p.cssHooks.opacity={get:function(a,b){return bL.test((b&&a.currentStyle?a.currentStyle.filter:a.style.filter)||"")?.01*parseFloat(RegExp.$1)+"":b?"1":""},set:function(a,b){var c=a.style,d=a.currentStyle,e=p.isNumeric(b)?"alpha(opacity="+b*100+")":"",f=d&&d.filter||c.filter||"";c.zoom=1;if(b>=1&&p.trim(f.replace(bK,""))===""&&c.removeAttribute){c.removeAttribute("filter");if(d&&!d.filter)return}c.filter=bK.test(f)?f.replace(bK,e):f+" "+e}}),p(function(){p.support.reliableMarginRight||(p.cssHooks.marginRight={get:function(a,b){return p.swap(a,{display:"inline-block"},function(){if(b)return bH(a,"marginRight")})}}),!p.support.pixelPosition&&p.fn.position&&p.each(["top","left"],function(a,b){p.cssHooks[b]={get:function(a,c){if(c){var d=bH(a,b);return bP.test(d)?p(a).position()[b]+"px":d}}}})}),p.expr&&p.expr.filters&&(p.expr.filters.hidden=function(a){return a.offsetWidth===0&&a.offsetHeight===0||!p.support.reliableHiddenOffsets&&(a.style&&a.style.display||bH(a,"display"))==="none"},p.expr.filters.visible=function(a){return!p.expr.filters.hidden(a)}),p.each({margin:"",padding:"",border:"Width"},function(a,b){p.cssHooks[a+b]={expand:function(c){var d,e=typeof c=="string"?c.split(" "):[c],f={};for(d=0;d<4;d++)f[a+bU[d]+b]=e[d]||e[d-2]||e[0];return f}},bN.test(a)||(p.cssHooks[a+b].set=b$)});var cc=/%20/g,cd=/\[\]$/,ce=/\r?\n/g,cf=/^(?:color|date|datetime|datetime-local|email|hidden|month|number|password|range|search|tel|text|time|url|week)$/i,cg=/^(?:select|textarea)/i;p.fn.extend({serialize:function(){return p.param(this.serializeArray())},serializeArray:function(){return this.map(function(){return this.elements?p.makeArray(this.elements):this}).filter(function(){return this.name&&!this.disabled&&(this.checked||cg.test(this.nodeName)||cf.test(this.type))}).map(function(a,b){var c=p(this).val();return c==null?null:p.isArray(c)?p.map(c,function(a,c){return{name:b.name,value:a.replace(ce,"\r\n")}}):{name:b.name,value:c.replace(ce,"\r\n")}}).get()}}),p.param=function(a,c){var d,e=[],f=function(a,b){b=p.isFunction(b)?b():b==null?"":b,e[e.length]=encodeURIComponent(a)+"="+encodeURIComponent(b)};c===b&&(c=p.ajaxSettings&&p.ajaxSettings.traditional);if(p.isArray(a)||a.jquery&&!p.isPlainObject(a))p.each(a,function(){f(this.name,this.value)});else for(d in a)ch(d,a[d],c,f);return e.join("&").replace(cc,"+")};var ci,cj,ck=/#.*$/,cl=/^(.*?):[ \t]*([^\r\n]*)\r?$/mg,cm=/^(?:about|app|app\-storage|.+\-extension|file|res|widget):$/,cn=/^(?:GET|HEAD)$/,co=/^\/\//,cp=/\?/,cq=/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,cr=/([?&])_=[^&]*/,cs=/^([\w\+\.\-]+:)(?:\/\/([^\/?#:]*)(?::(\d+)|)|)/,ct=p.fn.load,cu={},cv={},cw=["*/"]+["*"];try{ci=f.href}catch(cx){ci=e.createElement("a"),ci.href="",ci=ci.href}cj=cs.exec(ci.toLowerCase())||[],p.fn.load=function(a,c,d){if(typeof a!="string"&&ct)return ct.apply(this,arguments);if(!this.length)return this;var e,f,g,h=this,i=a.indexOf(" ");return i>=0&&(e=a.slice(i,a.length),a=a.slice(0,i)),p.isFunction(c)?(d=c,c=b):typeof c=="object"&&(f="POST"),p.ajax({url:a,type:f,dataType:"html",data:c,complete:function(a,b){d&&h.each(d,g||[a.responseText,b,a])}}).done(function(a){g=arguments,h.html(e?p("<div>").append(a.replace(cq,"")).find(e):a)}),this},p.each("ajaxStart ajaxStop ajaxComplete ajaxError ajaxSuccess ajaxSend".split(" "),function(a,b){p.fn[b]=function(a){return this.on(b,a)}}),p.each(["get","post"],function(a,c){p[c]=function(a,d,e,f){return p.isFunction(d)&&(f=f||e,e=d,d=b),p.ajax({type:c,url:a,data:d,success:e,dataType:f})}}),p.extend({getScript:function(a,c){return p.get(a,b,c,"script")},getJSON:function(a,b,c){return p.get(a,b,c,"json")},ajaxSetup:function(a,b){return b?cA(a,p.ajaxSettings):(b=a,a=p.ajaxSettings),cA(a,b),a},ajaxSettings:{url:ci,isLocal:cm.test(cj[1]),global:!0,type:"GET",contentType:"application/x-www-form-urlencoded; charset=UTF-8",processData:!0,async:!0,accepts:{xml:"application/xml, text/xml",html:"text/html",text:"text/plain",json:"application/json, text/javascript","*":cw},contents:{xml:/xml/,html:/html/,json:/json/},responseFields:{xml:"responseXML",text:"responseText"},converters:{"* text":a.String,"text html":!0,"text json":p.parseJSON,"text xml":p.parseXML},flatOptions:{context:!0,url:!0}},ajaxPrefilter:cy(cu),ajaxTransport:cy(cv),ajax:function(a,c){function y(a,c,f,i){var k,s,t,u,w,y=c;if(v===2)return;v=2,h&&clearTimeout(h),g=b,e=i||"",x.readyState=a>0?4:0,f&&(u=cB(l,x,f));if(a>=200&&a<300||a===304)l.ifModified&&(w=x.getResponseHeader("Last-Modified"),w&&(p.lastModified[d]=w),w=x.getResponseHeader("Etag"),w&&(p.etag[d]=w)),a===304?(y="notmodified",k=!0):(k=cC(l,u),y=k.state,s=k.data,t=k.error,k=!t);else{t=y;if(!y||a)y="error",a<0&&(a=0)}x.status=a,x.statusText=""+(c||y),k?o.resolveWith(m,[s,y,x]):o.rejectWith(m,[x,y,t]),x.statusCode(r),r=b,j&&n.trigger("ajax"+(k?"Success":"Error"),[x,l,k?s:t]),q.fireWith(m,[x,y]),j&&(n.trigger("ajaxComplete",[x,l]),--p.active||p.event.trigger("ajaxStop"))}typeof a=="object"&&(c=a,a=b),c=c||{};var d,e,f,g,h,i,j,k,l=p.ajaxSetup({},c),m=l.context||l,n=m!==l&&(m.nodeType||m instanceof p)?p(m):p.event,o=p.Deferred(),q=p.Callbacks("once memory"),r=l.statusCode||{},t={},u={},v=0,w="canceled",x={readyState:0,setRequestHeader:function(a,b){if(!v){var c=a.toLowerCase();a=u[c]=u[c]||a,t[a]=b}return this},getAllResponseHeaders:function(){return v===2?e:null},getResponseHeader:function(a){var c;if(v===2){if(!f){f={};while(c=cl.exec(e))f[c[1].toLowerCase()]=c[2]}c=f[a.toLowerCase()]}return c===b?null:c},overrideMimeType:function(a){return v||(l.mimeType=a),this},abort:function(a){return a=a||w,g&&g.abort(a),y(0,a),this}};o.promise(x),x.success=x.done,x.error=x.fail,x.complete=q.add,x.statusCode=function(a){if(a){var b;if(v<2)for(b in a)r[b]=[r[b],a[b]];else b=a[x.status],x.always(b)}return this},l.url=((a||l.url)+"").replace(ck,"").replace(co,cj[1]+"//"),l.dataTypes=p.trim(l.dataType||"*").toLowerCase().split(s),l.crossDomain==null&&(i=cs.exec(l.url.toLowerCase()),l.crossDomain=!(!i||i[1]==cj[1]&&i[2]==cj[2]&&(i[3]||(i[1]==="http:"?80:443))==(cj[3]||(cj[1]==="http:"?80:443)))),l.data&&l.processData&&typeof l.data!="string"&&(l.data=p.param(l.data,l.traditional)),cz(cu,l,c,x);if(v===2)return x;j=l.global,l.type=l.type.toUpperCase(),l.hasContent=!cn.test(l.type),j&&p.active++===0&&p.event.trigger("ajaxStart");if(!l.hasContent){l.data&&(l.url+=(cp.test(l.url)?"&":"?")+l.data,delete l.data),d=l.url;if(l.cache===!1){var z=p.now(),A=l.url.replace(cr,"$1_="+z);l.url=A+(A===l.url?(cp.test(l.url)?"&":"?")+"_="+z:"")}}(l.data&&l.hasContent&&l.contentType!==!1||c.contentType)&&x.setRequestHeader("Content-Type",l.contentType),l.ifModified&&(d=d||l.url,p.lastModified[d]&&x.setRequestHeader("If-Modified-Since",p.lastModified[d]),p.etag[d]&&x.setRequestHeader("If-None-Match",p.etag[d])),x.setRequestHeader("Accept",l.dataTypes[0]&&l.accepts[l.dataTypes[0]]?l.accepts[l.dataTypes[0]]+(l.dataTypes[0]!=="*"?", "+cw+"; q=0.01":""):l.accepts["*"]);for(k in l.headers)x.setRequestHeader(k,l.headers[k]);if(!l.beforeSend||l.beforeSend.call(m,x,l)!==!1&&v!==2){w="abort";for(k in{success:1,error:1,complete:1})x[k](l[k]);g=cz(cv,l,c,x);if(!g)y(-1,"No Transport");else{x.readyState=1,j&&n.trigger("ajaxSend",[x,l]),l.async&&l.timeout>0&&(h=setTimeout(function(){x.abort("timeout")},l.timeout));try{v=1,g.send(t,y)}catch(B){if(v<2)y(-1,B);else throw B}}return x}return x.abort()},active:0,lastModified:{},etag:{}});var cD=[],cE=/\?/,cF=/(=)\?(?=&|$)|\?\?/,cG=p.now();p.ajaxSetup({jsonp:"callback",jsonpCallback:function(){var a=cD.pop()||p.expando+"_"+cG++;return this[a]=!0,a}}),p.ajaxPrefilter("json jsonp",function(c,d,e){var f,g,h,i=c.data,j=c.url,k=c.jsonp!==!1,l=k&&cF.test(j),m=k&&!l&&typeof i=="string"&&!(c.contentType||"").indexOf("application/x-www-form-urlencoded")&&cF.test(i);if(c.dataTypes[0]==="jsonp"||l||m)return f=c.jsonpCallback=p.isFunction(c.jsonpCallback)?c.jsonpCallback():c.jsonpCallback,g=a[f],l?c.url=j.replace(cF,"$1"+f):m?c.data=i.replace(cF,"$1"+f):k&&(c.url+=(cE.test(j)?"&":"?")+c.jsonp+"="+f),c.converters["script json"]=function(){return h||p.error(f+" was not called"),h[0]},c.dataTypes[0]="json",a[f]=function(){h=arguments},e.always(function(){a[f]=g,c[f]&&(c.jsonpCallback=d.jsonpCallback,cD.push(f)),h&&p.isFunction(g)&&g(h[0]),h=g=b}),"script"}),p.ajaxSetup({accepts:{script:"text/javascript, application/javascript, application/ecmascript, application/x-ecmascript"},contents:{script:/javascript|ecmascript/},converters:{"text script":function(a){return p.globalEval(a),a}}}),p.ajaxPrefilter("script",function(a){a.cache===b&&(a.cache=!1),a.crossDomain&&(a.type="GET",a.global=!1)}),p.ajaxTransport("script",function(a){if(a.crossDomain){var c,d=e.head||e.getElementsByTagName("head")[0]||e.documentElement;return{send:function(f,g){c=e.createElement("script"),c.async="async",a.scriptCharset&&(c.charset=a.scriptCharset),c.src=a.url,c.onload=c.onreadystatechange=function(a,e){if(e||!c.readyState||/loaded|complete/.test(c.readyState))c.onload=c.onreadystatechange=null,d&&c.parentNode&&d.removeChild(c),c=b,e||g(200,"success")},d.insertBefore(c,d.firstChild)},abort:function(){c&&c.onload(0,1)}}}});var cH,cI=a.ActiveXObject?function(){for(var a in cH)cH[a](0,1)}:!1,cJ=0;p.ajaxSettings.xhr=a.ActiveXObject?function(){return!this.isLocal&&cK()||cL()}:cK,function(a){p.extend(p.support,{ajax:!!a,cors:!!a&&"withCredentials"in a})}(p.ajaxSettings.xhr()),p.support.ajax&&p.ajaxTransport(function(c){if(!c.crossDomain||p.support.cors){var d;return{send:function(e,f){var g,h,i=c.xhr();c.username?i.open(c.type,c.url,c.async,c.username,c.password):i.open(c.type,c.url,c.async);if(c.xhrFields)for(h in c.xhrFields)i[h]=c.xhrFields[h];c.mimeType&&i.overrideMimeType&&i.overrideMimeType(c.mimeType),!c.crossDomain&&!e["X-Requested-With"]&&(e["X-Requested-With"]="XMLHttpRequest");try{for(h in e)i.setRequestHeader(h,e[h])}catch(j){}i.send(c.hasContent&&c.data||null),d=function(a,e){var h,j,k,l,m;try{if(d&&(e||i.readyState===4)){d=b,g&&(i.onreadystatechange=p.noop,cI&&delete cH[g]);if(e)i.readyState!==4&&i.abort();else{h=i.status,k=i.getAllResponseHeaders(),l={},m=i.responseXML,m&&m.documentElement&&(l.xml=m);try{l.text=i.responseText}catch(a){}try{j=i.statusText}catch(n){j=""}!h&&c.isLocal&&!c.crossDomain?h=l.text?200:404:h===1223&&(h=204)}}}catch(o){e||f(-1,o)}l&&f(h,j,l,k)},c.async?i.readyState===4?setTimeout(d,0):(g=++cJ,cI&&(cH||(cH={},p(a).unload(cI)),cH[g]=d),i.onreadystatechange=d):d()},abort:function(){d&&d(0,1)}}}});var cM,cN,cO=/^(?:toggle|show|hide)$/,cP=new RegExp("^(?:([-+])=|)("+q+")([a-z%]*)$","i"),cQ=/queueHooks$/,cR=[cX],cS={"*":[function(a,b){var c,d,e,f=this.createTween(a,b),g=cP.exec(b),h=f.cur(),i=+h||0,j=1;if(g){c=+g[2],d=g[3]||(p.cssNumber[a]?"":"px");if(d!=="px"&&i){i=p.css(f.elem,a,!0)||c||1;do e=j=j||".5",i=i/j,p.style(f.elem,a,i+d),j=f.cur()/h;while(j!==1&&j!==e)}f.unit=d,f.start=i,f.end=g[1]?i+(g[1]+1)*c:c}return f}]};p.Animation=p.extend(cV,{tweener:function(a,b){p.isFunction(a)?(b=a,a=["*"]):a=a.split(" ");var c,d=0,e=a.length;for(;d<e;d++)c=a[d],cS[c]=cS[c]||[],cS[c].unshift(b)},prefilter:function(a,b){b?cR.unshift(a):cR.push(a)}}),p.Tween=cY,cY.prototype={constructor:cY,init:function(a,b,c,d,e,f){this.elem=a,this.prop=c,this.easing=e||"swing",this.options=b,this.start=this.now=this.cur(),this.end=d,this.unit=f||(p.cssNumber[c]?"":"px")},cur:function(){var a=cY.propHooks[this.prop];return a&&a.get?a.get(this):cY.propHooks._default.get(this)},run:function(a){var b,c=cY.propHooks[this.prop];return this.pos=b=p.easing[this.easing](a,this.options.duration*a,0,1,this.options.duration),this.now=(this.end-this.start)*b+this.start,this.options.step&&this.options.step.call(this.elem,this.now,this),c&&c.set?c.set(this):cY.propHooks._default.set(this),this}},cY.prototype.init.prototype=cY.prototype,cY.propHooks={_default:{get:function(a){var b;return a.elem[a.prop]==null||!!a.elem.style&&a.elem.style[a.prop]!=null?(b=p.css(a.elem,a.prop,!1,""),!b||b==="auto"?0:b):a.elem[a.prop]},set:function(a){p.fx.step[a.prop]?p.fx.step[a.prop](a):a.elem.style&&(a.elem.style[p.cssProps[a.prop]]!=null||p.cssHooks[a.prop])?p.style(a.elem,a.prop,a.now+a.unit):a.elem[a.prop]=a.now}}},cY.propHooks.scrollTop=cY.propHooks.scrollLeft={set:function(a){a.elem.nodeType&&a.elem.parentNode&&(a.elem[a.prop]=a.now)}},p.each(["toggle","show","hide"],function(a,b){var c=p.fn[b];p.fn[b]=function(d,e,f){return d==null||typeof d=="boolean"||!a&&p.isFunction(d)&&p.isFunction(e)?c.apply(this,arguments):this.animate(cZ(b,!0),d,e,f)}}),p.fn.extend({fadeTo:function(a,b,c,d){return this.filter(bY).css("opacity",0).show().end().animate({opacity:b},a,c,d)},animate:function(a,b,c,d){var e=p.isEmptyObject(a),f=p.speed(b,c,d),g=function(){var b=cV(this,p.extend({},a),f);e&&b.stop(!0)};return e||f.queue===!1?this.each(g):this.queue(f.queue,g)},stop:function(a,c,d){var e=function(a){var b=a.stop;delete a.stop,b(d)};return typeof a!="string"&&(d=c,c=a,a=b),c&&a!==!1&&this.queue(a||"fx",[]),this.each(function(){var b=!0,c=a!=null&&a+"queueHooks",f=p.timers,g=p._data(this);if(c)g[c]&&g[c].stop&&e(g[c]);else for(c in g)g[c]&&g[c].stop&&cQ.test(c)&&e(g[c]);for(c=f.length;c--;)f[c].elem===this&&(a==null||f[c].queue===a)&&(f[c].anim.stop(d),b=!1,f.splice(c,1));(b||!d)&&p.dequeue(this,a)})}}),p.each({slideDown:cZ("show"),slideUp:cZ("hide"),slideToggle:cZ("toggle"),fadeIn:{opacity:"show"},fadeOut:{opacity:"hide"},fadeToggle:{opacity:"toggle"}},function(a,b){p.fn[a]=function(a,c,d){return this.animate(b,a,c,d)}}),p.speed=function(a,b,c){var d=a&&typeof a=="object"?p.extend({},a):{complete:c||!c&&b||p.isFunction(a)&&a,duration:a,easing:c&&b||b&&!p.isFunction(b)&&b};d.duration=p.fx.off?0:typeof d.duration=="number"?d.duration:d.duration in p.fx.speeds?p.fx.speeds[d.duration]:p.fx.speeds._default;if(d.queue==null||d.queue===!0)d.queue="fx";return d.old=d.complete,d.complete=function(){p.isFunction(d.old)&&d.old.call(this),d.queue&&p.dequeue(this,d.queue)},d},p.easing={linear:function(a){return a},swing:function(a){return.5-Math.cos(a*Math.PI)/2}},p.timers=[],p.fx=cY.prototype.init,p.fx.tick=function(){var a,b=p.timers,c=0;for(;c<b.length;c++)a=b[c],!a()&&b[c]===a&&b.splice(c--,1);b.length||p.fx.stop()},p.fx.timer=function(a){a()&&p.timers.push(a)&&!cN&&(cN=setInterval(p.fx.tick,p.fx.interval))},p.fx.interval=13,p.fx.stop=function(){clearInterval(cN),cN=null},p.fx.speeds={slow:600,fast:200,_default:400},p.fx.step={},p.expr&&p.expr.filters&&(p.expr.filters.animated=function(a){return p.grep(p.timers,function(b){return a===b.elem}).length});var c$=/^(?:body|html)$/i;p.fn.offset=function(a){if(arguments.length)return a===b?this:this.each(function(b){p.offset.setOffset(this,a,b)});var c,d,e,f,g,h,i,j,k,l,m=this[0],n=m&&m.ownerDocument;if(!n)return;return(e=n.body)===m?p.offset.bodyOffset(m):(d=n.documentElement,p.contains(d,m)?(c=m.getBoundingClientRect(),f=c_(n),g=d.clientTop||e.clientTop||0,h=d.clientLeft||e.clientLeft||0,i=f.pageYOffset||d.scrollTop,j=f.pageXOffset||d.scrollLeft,k=c.top+i-g,l=c.left+j-h,{top:k,left:l}):{top:0,left:0})},p.offset={bodyOffset:function(a){var b=a.offsetTop,c=a.offsetLeft;return p.support.doesNotIncludeMarginInBodyOffset&&(b+=parseFloat(p.css(a,"marginTop"))||0,c+=parseFloat(p.css(a,"marginLeft"))||0),{top:b,left:c}},setOffset:function(a,b,c){var d=p.css(a,"position");d==="static"&&(a.style.position="relative");var e=p(a),f=e.offset(),g=p.css(a,"top"),h=p.css(a,"left"),i=(d==="absolute"||d==="fixed")&&p.inArray("auto",[g,h])>-1,j={},k={},l,m;i?(k=e.position(),l=k.top,m=k.left):(l=parseFloat(g)||0,m=parseFloat(h)||0),p.isFunction(b)&&(b=b.call(a,c,f)),b.top!=null&&(j.top=b.top-f.top+l),b.left!=null&&(j.left=b.left-f.left+m),"using"in b?b.using.call(a,j):e.css(j)}},p.fn.extend({position:function(){if(!this[0])return;var a=this[0],b=this.offsetParent(),c=this.offset(),d=c$.test(b[0].nodeName)?{top:0,left:0}:b.offset();return c.top-=parseFloat(p.css(a,"marginTop"))||0,c.left-=parseFloat(p.css(a,"marginLeft"))||0,d.top+=parseFloat(p.css(b[0],"borderTopWidth"))||0,d.left+=parseFloat(p.css(b[0],"borderLeftWidth"))||0,{top:c.top-d.top,left:c.left-d.left}},offsetParent:function(){return this.map(function(){var a=this.offsetParent||e.body;while(a&&!c$.test(a.nodeName)&&p.css(a,"position")==="static")a=a.offsetParent;return a||e.body})}}),p.each({scrollLeft:"pageXOffset",scrollTop:"pageYOffset"},function(a,c){var d=/Y/.test(c);p.fn[a]=function(e){return p.access(this,function(a,e,f){var g=c_(a);if(f===b)return g?c in g?g[c]:g.document.documentElement[e]:a[e];g?g.scrollTo(d?p(g).scrollLeft():f,d?f:p(g).scrollTop()):a[e]=f},a,e,arguments.length,null)}}),p.each({Height:"height",Width:"width"},function(a,c){p.each({padding:"inner"+a,content:c,"":"outer"+a},function(d,e){p.fn[e]=function(e,f){var g=arguments.length&&(d||typeof e!="boolean"),h=d||(e===!0||f===!0?"margin":"border");return p.access(this,function(c,d,e){var f;return p.isWindow(c)?c.document.documentElement["client"+a]:c.nodeType===9?(f=c.documentElement,Math.max(c.body["scroll"+a],f["scroll"+a],c.body["offset"+a],f["offset"+a],f["client"+a])):e===b?p.css(c,d,e,h):p.style(c,d,e,h)},c,g?e:b,g)}})}),a.jQuery=a.$=p,typeof define=="function"&&define.amd&&define.amd.jQuery&&define("jquery",[],function(){return p})})(window);





/* jquery color plugin minified */
/* downloaded from here: https://github.com/jquery/jquery-color */
(function(jQuery,undefined){var stepHooks="backgroundColor borderBottomColor borderLeftColor borderRightColor borderTopColor color outlineColor".split(" "),rplusequals=/^([\-+])=\s*(\d+\.?\d*)/,stringParsers=[{re:/rgba?\(\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3})\s*(?:,\s*(\d+(?:\.\d+)?)\s*)?\)/,parse:function(execResult){return[execResult[1],execResult[2],execResult[3],execResult[4]]}},{re:/rgba?\(\s*(\d+(?:\.\d+)?)\%\s*,\s*(\d+(?:\.\d+)?)\%\s*,\s*(\d+(?:\.\d+)?)\%\s*(?:,\s*(\d+(?:\.\d+)?)\s*)?\)/,parse:function(execResult){return[2.55*execResult[1],2.55*execResult[2],2.55*execResult[3],execResult[4]]}},{re:/#([a-fA-F0-9]{2})([a-fA-F0-9]{2})([a-fA-F0-9]{2})/,parse:function(execResult){return[parseInt(execResult[1],16),parseInt(execResult[2],16),parseInt(execResult[3],16)]}},{re:/#([a-fA-F0-9])([a-fA-F0-9])([a-fA-F0-9])/,parse:function(execResult){return[parseInt(execResult[1]+execResult[1],16),parseInt(execResult[2]+execResult[2],16),parseInt(execResult[3]+execResult[3],16)]}},{re:/hsla?\(\s*(\d+(?:\.\d+)?)\s*,\s*(\d+(?:\.\d+)?)\%\s*,\s*(\d+(?:\.\d+)?)\%\s*(?:,\s*(\d+(?:\.\d+)?)\s*)?\)/,space:"hsla",parse:function(execResult){return[execResult[1],execResult[2]/100,execResult[3]/100,execResult[4]]}}],color=jQuery.Color=function(color,green,blue,alpha){return new jQuery.Color.fn.parse(color,green,blue,alpha)},spaces={rgba:{cache:"_rgba",props:{red:{idx:0,type:"byte",empty:true},green:{idx:1,type:"byte",empty:true},blue:{idx:2,type:"byte",empty:true},alpha:{idx:3,type:"percent",def:1}}},hsla:{cache:"_hsla",props:{hue:{idx:0,type:"degrees",empty:true},saturation:{idx:1,type:"percent",empty:true},lightness:{idx:2,type:"percent",empty:true}}}},propTypes={"byte":{floor:true,min:0,max:255},"percent":{min:0,max:1},"degrees":{mod:360,floor:true}},rgbaspace=spaces.rgba.props,support=color.support={},colors,each=jQuery.each;spaces.hsla.props.alpha=rgbaspace.alpha;function clamp(value,prop,alwaysAllowEmpty){var type=propTypes[prop.type]||{},allowEmpty=prop.empty||alwaysAllowEmpty;if(allowEmpty&&value==null){return null}if(prop.def&&value==null){return prop.def}if(type.floor){value=~~value}else{value=parseFloat(value)}if(value==null||isNaN(value)){return prop.def}if(type.mod){value=value%type.mod;return value<0?type.mod+value:value}return type.min>value?type.min:type.max<value?type.max:value}function stringParse(string){var inst=color(),rgba=inst._rgba=[];string=string.toLowerCase();each(stringParsers,function(i,parser){var match=parser.re.exec(string),values=match&&parser.parse(match),parsed,spaceName=parser.space||"rgba",cache=spaces[spaceName].cache;if(values){parsed=inst[spaceName](values);inst[cache]=parsed[cache];rgba=inst._rgba=parsed._rgba;return false}});if(rgba.length!==0){if(Math.max.apply(Math,rgba)===0){jQuery.extend(rgba,colors.transparent)}return inst}if(string=colors[string]){return string}}color.fn=color.prototype={constructor:color,parse:function(red,green,blue,alpha){if(red===undefined){this._rgba=[null,null,null,null];return this}if(red instanceof jQuery||red.nodeType){red=red instanceof jQuery?red.css(green):jQuery(red).css(green);green=undefined}var inst=this,type=jQuery.type(red),rgba=this._rgba=[],source;if(green!==undefined){red=[red,green,blue,alpha];type="array"}if(type==="string"){return this.parse(stringParse(red)||colors._default)}if(type==="array"){each(rgbaspace,function(key,prop){rgba[prop.idx]=clamp(red[prop.idx],prop)});return this}if(type==="object"){if(red instanceof color){each(spaces,function(spaceName,space){if(red[space.cache]){inst[space.cache]=red[space.cache].slice()}})}else{each(spaces,function(spaceName,space){each(space.props,function(key,prop){var cache=space.cache;if(!inst[cache]&&space.to){if(red[key]==null||key==="alpha"){return}inst[cache]=space.to(inst._rgba)}inst[cache][prop.idx]=clamp(red[key],prop,true)})})}return this}},is:function(compare){var is=color(compare),same=true,myself=this;each(spaces,function(_,space){var isCache=is[space.cache],localCache;if(isCache){localCache=myself[space.cache]||space.to&&space.to(myself._rgba)||[];each(space.props,function(_,prop){if(isCache[prop.idx]!=null){same=(isCache[prop.idx]===localCache[prop.idx]);return same}})}return same});return same},_space:function(){var used=[],inst=this;each(spaces,function(spaceName,space){if(inst[space.cache]){used.push(spaceName)}});return used.pop()},transition:function(other,distance){var end=color(other),spaceName=end._space(),space=spaces[spaceName],start=this[space.cache]||space.to(this._rgba),result=start.slice();end=end[space.cache];each(space.props,function(key,prop){var index=prop.idx,startValue=start[index],endValue=end[index],type=propTypes[prop.type]||{};if(endValue===null){return}if(startValue===null){result[index]=endValue}else{if(type.mod){if(endValue-startValue>type.mod/2){startValue+=type.mod}else if(startValue-endValue>type.mod/2){startValue-=type.mod}}result[prop.idx]=clamp((endValue-startValue)*distance+startValue,prop)}});return this[spaceName](result)},blend:function(opaque){if(this._rgba[3]===1){return this}var rgb=this._rgba.slice(),a=rgb.pop(),blend=color(opaque)._rgba;return color(jQuery.map(rgb,function(v,i){return(1-a)*blend[i]+a*v}))},toRgbaString:function(){var prefix="rgba(",rgba=jQuery.map(this._rgba,function(v,i){return v==null?(i>2?1:0):v});if(rgba[3]===1){rgba.pop();prefix="rgb("}return prefix+rgba.join(",")+")"},toHslaString:function(){var prefix="hsla(",hsla=jQuery.map(this.hsla(),function(v,i){if(v==null){v=i>2?1:0}if(i&&i<3){v=Math.round(v*100)+"%"}return v});if(hsla[3]===1){hsla.pop();prefix="hsl("}return prefix+hsla.join(",")+")"},toHexString:function(includeAlpha){var rgba=this._rgba.slice(),alpha=rgba.pop();if(includeAlpha){rgba.push(~~(alpha*255))}return"#"+jQuery.map(rgba,function(v,i){v=(v||0).toString(16);return v.length===1?"0"+v:v}).join("")},toString:function(){return this._rgba[3]===0?"transparent":this.toRgbaString()}};color.fn.parse.prototype=color.fn;function hue2rgb(p,q,h){h=(h+1)%1;if(h*6<1){return p+(q-p)*6*h}if(h*2<1){return q}if(h*3<2){return p+(q-p)*((2/3)-h)*6}return p}spaces.hsla.to=function(rgba){if(rgba[0]==null||rgba[1]==null||rgba[2]==null){return[null,null,null,rgba[3]]}var r=rgba[0]/255,g=rgba[1]/255,b=rgba[2]/255,a=rgba[3],max=Math.max(r,g,b),min=Math.min(r,g,b),diff=max-min,add=max+min,l=add*0.5,h,s;if(min===max){h=0}else if(r===max){h=(60*(g-b)/diff)+360}else if(g===max){h=(60*(b-r)/diff)+120}else{h=(60*(r-g)/diff)+240}if(l===0||l===1){s=l}else if(l<=0.5){s=diff/add}else{s=diff/(2-add)}return[Math.round(h)%360,s,l,a==null?1:a]};spaces.hsla.from=function(hsla){if(hsla[0]==null||hsla[1]==null||hsla[2]==null){return[null,null,null,hsla[3]]}var h=hsla[0]/360,s=hsla[1],l=hsla[2],a=hsla[3],q=l<=0.5?l*(1+s):l+s-l*s,p=2*l-q,r,g,b;return[Math.round(hue2rgb(p,q,h+(1/3))*255),Math.round(hue2rgb(p,q,h)*255),Math.round(hue2rgb(p,q,h-(1/3))*255),a]};each(spaces,function(spaceName,space){var props=space.props,cache=space.cache,to=space.to,from=space.from;color.fn[spaceName]=function(value){if(to&&!this[cache]){this[cache]=to(this._rgba)}if(value===undefined){return this[cache].slice()}var type=jQuery.type(value),arr=(type==="array"||type==="object")?value:arguments,local=this[cache].slice(),ret;each(props,function(key,prop){var val=arr[type==="object"?key:prop.idx];if(val==null){val=local[prop.idx]}local[prop.idx]=clamp(val,prop)});if(from){ret=color(from(local));ret[cache]=local;return ret}else{return color(local)}};each(props,function(key,prop){if(color.fn[key]){return}color.fn[key]=function(value){var vtype=jQuery.type(value),fn=(key==='alpha'?(this._hsla?'hsla':'rgba'):spaceName),local=this[fn](),cur=local[prop.idx],match;if(vtype==="undefined"){return cur}if(vtype==="function"){value=value.call(this,cur);vtype=jQuery.type(value)}if(value==null&&prop.empty){return this}if(vtype==="string"){match=rplusequals.exec(value);if(match){value=cur+parseFloat(match[2])*(match[1]==="+"?1:-1)}}local[prop.idx]=value;return this[fn](local)}})});each(stepHooks,function(i,hook){jQuery.cssHooks[hook]={set:function(elem,value){var parsed,backgroundColor,curElem;if(jQuery.type(value)!=='string'||(parsed=stringParse(value))){value=color(parsed||value);if(!support.rgba&&value._rgba[3]!==1){curElem=hook==="backgroundColor"?elem.parentNode:elem;do{backgroundColor=jQuery.curCSS(curElem,"backgroundColor")}while((backgroundColor===""||backgroundColor==="transparent")&&(curElem=curElem.parentNode)&&curElem.style);value=value.blend(backgroundColor&&backgroundColor!=="transparent"?backgroundColor:"_default")}value=value.toRgbaString()}try{elem.style[hook]=value}catch(value){}}};jQuery.fx.step[hook]=function(fx){if(!fx.colorInit){fx.start=color(fx.elem,hook);fx.end=color(fx.end);fx.colorInit=true}jQuery.cssHooks[hook].set(fx.elem,fx.start.transition(fx.end,fx.pos))}});jQuery(function(){var div=document.createElement("div"),div_style=div.style;div_style.cssText="background-color:rgba(1,1,1,.5)";support.rgba=div_style.backgroundColor.indexOf("rgba")>-1});colors=jQuery.Color.names={aqua:"#00ffff",azure:"#f0ffff",beige:"#f5f5dc",black:"#000000",blue:"#0000ff",brown:"#a52a2a",cyan:"#00ffff",darkblue:"#00008b",darkcyan:"#008b8b",darkgrey:"#a9a9a9",darkgreen:"#006400",darkkhaki:"#bdb76b",darkmagenta:"#8b008b",darkolivegreen:"#556b2f",darkorange:"#ff8c00",darkorchid:"#9932cc",darkred:"#8b0000",darksalmon:"#e9967a",darkviolet:"#9400d3",fuchsia:"#ff00ff",gold:"#ffd700",green:"#008000",indigo:"#4b0082",khaki:"#f0e68c",lightblue:"#add8e6",lightcyan:"#e0ffff",lightgreen:"#90ee90",lightgrey:"#d3d3d3",lightpink:"#ffb6c1",lightyellow:"#ffffe0",lime:"#00ff00",magenta:"#ff00ff",maroon:"#800000",navy:"#000080",olive:"#808000",orange:"#ffa500",pink:"#ffc0cb",purple:"#800080",violet:"#800080",red:"#ff0000",silver:"#c0c0c0",white:"#ffffff",yellow:"#ffff00",transparent:[null,null,null,0],_default:"#ffffff"}})(jQuery);

/*
 * SimpleModal 1.4.2 - jQuery Plugin
 * http://simplemodal.com/
 * Copyright (c) 2011 Eric Martin
 * Licensed under MIT and GPL
 * Date: Sat, Dec 17 2011 15:35:38 -0800
 */
(function(b){"function"===typeof define&&define.amd?define(["jquery"],b):b(jQuery)})(function(b){var j=[],k=b(document),l=b.browser.msie&&6===parseInt(b.browser.version)&&"object"!==typeof window.XMLHttpRequest,n=b.browser.msie&&7===parseInt(b.browser.version),m=null,h=b(window),i=[];b.modal=function(a,d){return b.modal.impl.init(a,d)};b.modal.close=function(){b.modal.impl.close()};b.modal.focus=function(a){b.modal.impl.focus(a)};b.modal.setContainerDimensions=function(){b.modal.impl.setContainerDimensions()};
b.modal.setPosition=function(){b.modal.impl.setPosition()};b.modal.update=function(a,d){b.modal.impl.update(a,d)};b.fn.modal=function(a){return b.modal.impl.init(this,a)};b.modal.defaults={appendTo:"body",focus:!0,opacity:50,overlayId:"simplemodal-overlay",overlayCss:{},containerId:"simplemodal-container",containerCss:{},dataId:"simplemodal-data",dataCss:{},minHeight:null,minWidth:null,maxHeight:null,maxWidth:null,autoResize:!1,autoPosition:!0,zIndex:1E3,close:!0,closeHTML:'<a class="modalCloseImg" title="Close"></a>',
closeClass:"simplemodal-close",escClose:!0,overlayClose:!1,fixed:!0,position:null,persist:!1,modal:!0,onOpen:null,onShow:null,onClose:null};b.modal.impl={d:{},init:function(a,d){if(this.d.data)return!1;m=b.browser.msie&&!b.boxModel;this.o=b.extend({},b.modal.defaults,d);this.zIndex=this.o.zIndex;this.occb=!1;if("object"===typeof a){if(a=a instanceof jQuery?a:b(a),this.d.placeholder=!1,0<a.parent().parent().size()&&(a.before(b("<span></span>").attr("id","simplemodal-placeholder").css({display:"none"})),
this.d.placeholder=!0,this.display=a.css("display"),!this.o.persist))this.d.orig=a.clone(!0)}else if("string"===typeof a||"number"===typeof a)a=b("<div></div>").html(a);else return alert("SimpleModal Error: Unsupported data type: "+typeof a),this;this.create(a);this.open();b.isFunction(this.o.onShow)&&this.o.onShow.apply(this,[this.d]);return this},create:function(a){this.getDimensions();if(this.o.modal&&l)this.d.iframe=b('<iframe src="javascript:false;"></iframe>').css(b.extend(this.o.iframeCss,
{display:"none",opacity:0,position:"fixed",height:i[0],width:i[1],zIndex:this.o.zIndex,top:0,left:0})).appendTo(this.o.appendTo);this.d.overlay=b("<div></div>").attr("id",this.o.overlayId).addClass("simplemodal-overlay").css(b.extend(this.o.overlayCss,{display:"none",opacity:this.o.opacity/100,height:this.o.modal?j[0]:0,width:this.o.modal?j[1]:0,position:"fixed",left:0,top:0,zIndex:this.o.zIndex+1})).appendTo(this.o.appendTo);this.d.container=b("<div></div>").attr("id",this.o.containerId).addClass("simplemodal-container").css(b.extend({position:this.o.fixed?
"fixed":"absolute"},this.o.containerCss,{display:"none",zIndex:this.o.zIndex+2})).append(this.o.close&&this.o.closeHTML?b(this.o.closeHTML).addClass(this.o.closeClass):"").appendTo(this.o.appendTo);this.d.wrap=b("<div></div>").attr("tabIndex",-1).addClass("simplemodal-wrap").css({height:"100%",outline:0,width:"100%"}).appendTo(this.d.container);this.d.data=a.attr("id",a.attr("id")||this.o.dataId).addClass("simplemodal-data").css(b.extend(this.o.dataCss,{display:"none"})).appendTo("body");this.setContainerDimensions();
this.d.data.appendTo(this.d.wrap);(l||m)&&this.fixIE()},bindEvents:function(){var a=this;b("."+a.o.closeClass).bind("click.simplemodal",function(b){b.preventDefault();a.close()});a.o.modal&&a.o.close&&a.o.overlayClose&&a.d.overlay.bind("click.simplemodal",function(b){b.preventDefault();a.close()});k.bind("keydown.simplemodal",function(b){a.o.modal&&9===b.keyCode?a.watchTab(b):a.o.close&&a.o.escClose&&27===b.keyCode&&(b.preventDefault(),a.close())});h.bind("resize.simplemodal orientationchange.simplemodal",
function(){a.getDimensions();a.o.autoResize?a.setContainerDimensions():a.o.autoPosition&&a.setPosition();l||m?a.fixIE():a.o.modal&&(a.d.iframe&&a.d.iframe.css({height:i[0],width:i[1]}),a.d.overlay.css({height:j[0],width:j[1]}))})},unbindEvents:function(){b("."+this.o.closeClass).unbind("click.simplemodal");k.unbind("keydown.simplemodal");h.unbind(".simplemodal");this.d.overlay.unbind("click.simplemodal")},fixIE:function(){var a=this.o.position;b.each([this.d.iframe||null,!this.o.modal?null:this.d.overlay,
"fixed"===this.d.container.css("position")?this.d.container:null],function(b,f){if(f){var g=f[0].style;g.position="absolute";if(2>b)g.removeExpression("height"),g.removeExpression("width"),g.setExpression("height",'document.body.scrollHeight > document.body.clientHeight ? document.body.scrollHeight : document.body.clientHeight + "px"'),g.setExpression("width",'document.body.scrollWidth > document.body.clientWidth ? document.body.scrollWidth : document.body.clientWidth + "px"');else{var c,e;a&&a.constructor===
Array?(c=a[0]?"number"===typeof a[0]?a[0].toString():a[0].replace(/px/,""):f.css("top").replace(/px/,""),c=-1===c.indexOf("%")?c+' + (t = document.documentElement.scrollTop ? document.documentElement.scrollTop : document.body.scrollTop) + "px"':parseInt(c.replace(/%/,""))+' * ((document.documentElement.clientHeight || document.body.clientHeight) / 100) + (t = document.documentElement.scrollTop ? document.documentElement.scrollTop : document.body.scrollTop) + "px"',a[1]&&(e="number"===typeof a[1]?
a[1].toString():a[1].replace(/px/,""),e=-1===e.indexOf("%")?e+' + (t = document.documentElement.scrollLeft ? document.documentElement.scrollLeft : document.body.scrollLeft) + "px"':parseInt(e.replace(/%/,""))+' * ((document.documentElement.clientWidth || document.body.clientWidth) / 100) + (t = document.documentElement.scrollLeft ? document.documentElement.scrollLeft : document.body.scrollLeft) + "px"')):(c='(document.documentElement.clientHeight || document.body.clientHeight) / 2 - (this.offsetHeight / 2) + (t = document.documentElement.scrollTop ? document.documentElement.scrollTop : document.body.scrollTop) + "px"',
e='(document.documentElement.clientWidth || document.body.clientWidth) / 2 - (this.offsetWidth / 2) + (t = document.documentElement.scrollLeft ? document.documentElement.scrollLeft : document.body.scrollLeft) + "px"');g.removeExpression("top");g.removeExpression("left");g.setExpression("top",c);g.setExpression("left",e)}}})},focus:function(a){var d=this,a=a&&-1!==b.inArray(a,["first","last"])?a:"first",f=b(":input:enabled:visible:"+a,d.d.wrap);setTimeout(function(){0<f.length?f.focus():d.d.wrap.focus()},
10)},getDimensions:function(){var a=b.browser.opera&&"9.5"<b.browser.version&&"1.3">b.fn.jquery||b.browser.opera&&"9.5">b.browser.version&&"1.2.6"<b.fn.jquery?h[0].innerHeight:h.height();j=[k.height(),k.width()];i=[a,h.width()]},getVal:function(a,b){return a?"number"===typeof a?a:"auto"===a?0:0<a.indexOf("%")?parseInt(a.replace(/%/,""))/100*("h"===b?i[0]:i[1]):parseInt(a.replace(/px/,"")):null},update:function(a,b){if(!this.d.data)return!1;this.d.origHeight=this.getVal(a,"h");this.d.origWidth=this.getVal(b,
"w");this.d.data.hide();a&&this.d.container.css("height",a);b&&this.d.container.css("width",b);this.setContainerDimensions();this.d.data.show();this.o.focus&&this.focus();this.unbindEvents();this.bindEvents()},setContainerDimensions:function(){var a=l||n,d=this.d.origHeight?this.d.origHeight:b.browser.opera?this.d.container.height():this.getVal(a?this.d.container[0].currentStyle.height:this.d.container.css("height"),"h"),a=this.d.origWidth?this.d.origWidth:b.browser.opera?this.d.container.width():
this.getVal(a?this.d.container[0].currentStyle.width:this.d.container.css("width"),"w"),f=this.d.data.outerHeight(!0),g=this.d.data.outerWidth(!0);this.d.origHeight=this.d.origHeight||d;this.d.origWidth=this.d.origWidth||a;var c=this.o.maxHeight?this.getVal(this.o.maxHeight,"h"):null,e=this.o.maxWidth?this.getVal(this.o.maxWidth,"w"):null,c=c&&c<i[0]?c:i[0],e=e&&e<i[1]?e:i[1],h=this.o.minHeight?this.getVal(this.o.minHeight,"h"):"auto",d=d?this.o.autoResize&&d>c?c:d<h?h:d:f?f>c?c:this.o.minHeight&&
"auto"!==h&&f<h?h:f:h,c=this.o.minWidth?this.getVal(this.o.minWidth,"w"):"auto",a=a?this.o.autoResize&&a>e?e:a<c?c:a:g?g>e?e:this.o.minWidth&&"auto"!==c&&g<c?c:g:c;this.d.container.css({height:d,width:a});this.d.wrap.css({overflow:f>d||g>a?"auto":"visible"});this.o.autoPosition&&this.setPosition()},setPosition:function(){var a,b;a=i[0]/2-this.d.container.outerHeight(!0)/2;b=i[1]/2-this.d.container.outerWidth(!0)/2;var f="fixed"!==this.d.container.css("position")?h.scrollTop():0;this.o.position&&"[object Array]"===
Object.prototype.toString.call(this.o.position)?(a=f+(this.o.position[0]||a),b=this.o.position[1]||b):a=f+a;this.d.container.css({left:b,top:a})},watchTab:function(a){if(0<b(a.target).parents(".simplemodal-container").length){if(this.inputs=b(":input:enabled:visible:first, :input:enabled:visible:last",this.d.data[0]),!a.shiftKey&&a.target===this.inputs[this.inputs.length-1]||a.shiftKey&&a.target===this.inputs[0]||0===this.inputs.length)a.preventDefault(),this.focus(a.shiftKey?"last":"first")}else a.preventDefault(),
this.focus()},open:function(){this.d.iframe&&this.d.iframe.show();b.isFunction(this.o.onOpen)?this.o.onOpen.apply(this,[this.d]):(this.d.overlay.show(),this.d.container.show(),this.d.data.show());this.o.focus&&this.focus();this.bindEvents()},close:function(){if(!this.d.data)return!1;this.unbindEvents();if(b.isFunction(this.o.onClose)&&!this.occb)this.occb=!0,this.o.onClose.apply(this,[this.d]);else{if(this.d.placeholder){var a=b("#simplemodal-placeholder");this.o.persist?a.replaceWith(this.d.data.removeClass("simplemodal-data").css("display",
this.display)):(this.d.data.hide().remove(),a.replaceWith(this.d.orig))}else this.d.data.hide().remove();this.d.container.hide().remove();this.d.overlay.hide();this.d.iframe&&this.d.iframe.hide().remove();this.d.overlay.remove();this.d={}}}}});



// jeresig jquery.hotkeys
// https://github.com/jeresig/jquery.hotkeys

(function(a){function b(b){if(typeof b.data!=="string"){return}var c=b.handler,d=b.data.toLowerCase().split(" ");b.handler=function(b){if(this!==b.target&&(/textarea|select/i.test(b.target.nodeName)||b.target.type==="text")){return}var e=b.type!=="keypress"&&a.hotkeys.specialKeys[b.which],f=String.fromCharCode(b.which).toLowerCase(),g,h="",i={};if(b.altKey&&e!=="alt"){h+="alt+"}if(b.ctrlKey&&e!=="ctrl"){h+="ctrl+"}if(b.metaKey&&!b.ctrlKey&&e!=="meta"){h+="meta+"}if(b.shiftKey&&e!=="shift"){h+="shift+"}if(e){i[h+e]=true}else{i[h+f]=true;i[h+a.hotkeys.shiftNums[f]]=true;if(h==="shift+"){i[a.hotkeys.shiftNums[f]]=true}}for(var j=0,k=d.length;j<k;j++){if(i[d[j]]){return c.apply(this,arguments)}}}}a.hotkeys={version:"0.8",specialKeys:{8:"backspace",9:"tab",13:"return",16:"shift",17:"ctrl",18:"alt",19:"pause",20:"capslock",27:"esc",32:"space",33:"pageup",34:"pagedown",35:"end",36:"home",37:"left",38:"up",39:"right",40:"down",45:"insert",46:"del",96:"0",97:"1",98:"2",99:"3",100:"4",101:"5",102:"6",103:"7",104:"8",105:"9",106:"*",107:"+",109:"-",110:".",111:"/",112:"f1",113:"f2",114:"f3",115:"f4",116:"f5",117:"f6",118:"f7",119:"f8",120:"f9",121:"f10",122:"f11",123:"f12",144:"numlock",145:"scroll",191:"/",224:"meta"},shiftNums:{"`":"~",1:"!",2:"@",3:"#",4:"$",5:"%",6:"^",7:"&",8:"*",9:"(",0:")","-":"_","=":"+",";":": ","'":'"',",":"<",".":">","/":"?","\\":"|"}};a.each(["keydown","keyup","keypress"],function(){a.event.special[this]={add:b}})})(jQuery)





// launch with the main once the script loads
main();


// DEMETRICATOR END
