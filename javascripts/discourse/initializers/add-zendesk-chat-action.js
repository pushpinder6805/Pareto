 (function() {
   try {
     // Access Discourse APIs in a theme-safe way
     var apiInitializer = require("discourse/lib/api").apiInitializer;
     var registerIcon = require("discourse-common/lib/icon-library").registerIcon;
     var User = require("discourse/models/user").default;

     // Ensure the icon is available
     try { registerIcon("life-ring"); } catch (e) { /* ignore */ }

     apiInitializer("1.19.0", function(api) {
       try {
         var currentUser = (User && User.current) ? User.current() : null;
         if (!currentUser || !currentUser.staff) return;

         // internal category id that holds staff-only topic containers
         var INTERNAL_CATEGORY_ID = 242; // <-- replace with your category id if different

         // Find existing topic for channel, or create one
         async function ensureTopicForChannel(channelId, channelName) {
           var topicTitle = "[Chat] " + channelName;

           // Try search within the internal category
           try {
             var searchRes = await fetch("/search/query.json?q=" + encodeURIComponent(topicTitle) + "&category=" + INTERNAL_CATEGORY_ID);
             if (searchRes.ok) {
               var searchData = await searchRes.json();
               var existing = (searchData && searchData.topics) ? searchData.topics.find(function(t) { return t.title === topicTitle; }) : null;
               if (existing) {
                 console.log("Reusing internal topic:", existing.id);
                 return existing.id;
               }
             }
           } catch (e) {
             console.warn("Topic lookup failed:", e);
           }

           // Create a new hidden topic in the internal category
           try {
             var postRes = await fetch("/posts.json", {
               method: "POST",
               headers: {
                 "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
                 "X-CSRF-Token": (document.querySelector("meta[name='csrf-token']") || {}).content || ""
               },
               body: new URLSearchParams({
                 title: topicTitle,
                 raw: "Internal ticket container for chat channel **" + channelName + "** (ID " + channelId + ")",
                 archetype: "regular",
                 category: INTERNAL_CATEGORY_ID,
                 visible: "false"
               })
             });

             if (postRes.ok) {
               var postData = await postRes.json();
               if (postData && postData.topic_id) {
                 console.log("Created new internal topic:", postData.topic_id);
                 return postData.topic_id;
               }
             } else {
               // attempt to parse response body for debugging
               try { console.error("Create topic failed:", await postRes.text()); } catch(e) {}
             }
           } catch (e) {
             console.error("Failed to create internal topic:", e);
           }

           return null;
         }

         // Robust retrieval of current chat channel
         function getCurrentChatChannel() {
           try {
             var chatService = api.container.lookup("service:chat");
             if (chatService && chatService.activeChannel) return chatService.activeChannel;
           } catch (e) { /* ignore */ }

           // fallback: check global Discourse Chat object if present
           try {
             if (window.Discourse && window.Discourse.Chat && window.Discourse.Chat.currentChannel) {
               return window.Discourse.Chat.currentChannel;
             }
           } catch (e) { /* ignore */ }

           return null;
         }

         // Inject the menu item into chat message action menus
         function addZendeskButton() {
           var containers = document.querySelectorAll(".chat-message-actions-container");
           containers.forEach(function(container) {
             if (container.querySelector(".create-zendesk-ticket")) return;

             var details = container.querySelector(".more-actions-chat");
             if (!details) return;
             var detailsBody = details.querySelector(".select-kit-body");
             if (!detailsBody) return;

             var li = document.createElement("li");
             li.className = "select-kit-row dropdown-select-box-row create-zendesk-ticket ember-view";
             li.setAttribute("role", "menuitemradio");
             li.setAttribute("tabindex", "0");

             li.innerHTML = ''
               + '<div class="icons">'
               + '  <span class="selection-indicator"></span>'
               + '  <svg class="fa d-icon d-icon-life-ring svg-icon" aria-hidden="true">'
               + '    <use href="#life-ring"></use>'
               + '  </svg>'
               + '</div>'
               + '<div class="texts">'
               + '  <span class="name">Create Zendesk Ticket</span>'
               + '</div>';

             li.addEventListener("click", async function(e) {
               try {
                 e.preventDefault();
                 e.stopPropagation();

                 var messageId = container.dataset.id;
                 var messageEl = document.querySelector("[data-id='" + messageId + "']");
                 var messageText = "(no text)";
                 var messageAuthor = "Unknown";

                 try {
                   if (messageEl) {
                     var mt = messageEl.querySelector(".chat-message-text");
                     if (mt && mt.innerText) messageText = mt.innerText.trim();
                     var mu = messageEl.querySelector(".username");
                     if (mu && mu.innerText) messageAuthor = mu.innerText.trim();
                   }
                 } catch (e) { /* ignore element parsing errors */ }

                 var chatUrl = window.location.origin + "/chat/message/" + messageId;

                 var chatChannel = getCurrentChatChannel();
                 if (!chatChannel || !chatChannel.id) {
                   alert("Cannot create Zendesk ticket: missing chat channel context.");
                   return;
                 }

                 var channelId = chatChannel.id;
                 var channelName = chatChannel.title || chatChannel.name || ("Channel #" + channelId);
                 var subject = "[Chat] " + channelName + " — message from " + messageAuthor;
                 var description = "Message by " + messageAuthor + " in channel \"" + channelName + "\" (ID: " + channelId + ")\n\n" + messageText + "\n\nView message: " + chatUrl;

                 console.log("Creating Zendesk ticket from chat:", { channelId: channelId, channelName: channelName, messageId: messageId, subject: subject });

                 var topicId = await ensureTopicForChannel(channelId, channelName);
                 if (!topicId) {
                   alert("Failed to create or find topic for chat channel.");
                   return;
                 }

                 // POST to zendesk-plugin endpoint
                 var res = await fetch("/zendesk-plugin/issues.json", {
                   method: "POST",
                   headers: {
                     "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
                     "X-CSRF-Token": (document.querySelector("meta[name='csrf-token']") || {}).content || "",
                     "Accept": "application/json"
                   },
                   body: new URLSearchParams({
                     topic_id: topicId,
                     subject: subject,
                     description: description
                   })
                 });

                 var text = await res.text();
                 var data;
                 try {
                   data = JSON.parse(text);
                 } catch (parseErr) {
                   console.error("Zendesk returned non-JSON response:", text);
                   throw new Error("Zendesk returned non-JSON (" + res.status + ")");
                 }

                 if (!res.ok) {
                   console.error("Zendesk error:", data);
                   throw new Error("Zendesk API responded " + res.status);
                 }

                 console.log("Zendesk ticket created successfully:", data);
                 if (api && api.showToast) {
                   api.showToast("Zendesk ticket created successfully.", { title: "Success", icon: "check" });
                 } else {
                   alert("Zendesk ticket created successfully.");
                 }

                 if (data && data.zendesk_url) {
                   try { window.open(data.zendesk_url, "_blank"); } catch (e) { /* ignore */ }
                 }
               } catch (err) {
                 console.error("Zendesk ticket creation failed:", err);
                 if (api && api.showToast) {
                   api.showToast("Failed to create Zendesk ticket.", { title: "Error", icon: "times" });
                 } else {
                   alert("Failed to create Zendesk ticket. Check console for details.");
                 }
               }
             });

             detailsBody.appendChild(li);
           });
         }

         // MutationObserver to detect menus as they open
         var observer = new MutationObserver(function(mutations) {
           mutations.forEach(function(m) {
             m.addedNodes.forEach(function(node) {
               if (!(node instanceof HTMLElement)) return;
               if (node.classList && node.classList.contains && node.classList.contains("chat-message-actions-container")) {
                 addZendeskButton();
               } else if (node.querySelector && node.querySelector(".chat-message-actions-container")) {
                 addZendeskButton();
               }
             });
           });
         });

         observer.observe(document.body, { childList: true, subtree: true });

         // Initial run in case action containers already present
         addZendeskButton();
       } catch (innerErr) {
         console.error("Zendesk chat initializer failed:", innerErr);
       }
     });
   } catch (outerErr) {
     console.error("Zendesk chat script failed to load:", outerErr);
   }
 })();

