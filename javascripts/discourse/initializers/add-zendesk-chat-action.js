// Theme component version — NO imports
export default {
  name: "zendesk-chat-action",

  initialize() {
    const { apiInitializer } = require("discourse/lib/api");
    const { registerIcon } = require("discourse-common/lib/icon-library");
    const User = require("discourse/models/user").default;

    registerIcon("life-ring");

    apiInitializer("1.19.0", (api) => {
      try {
        const currentUser = User.current();
        if (!currentUser || !currentUser.staff) return;

        async function ensureTopicForChannel(channelId, channelName) {
          const topicTitle = `[Chat] ${channelName}`;
          const internalCategoryId = 242; // your Zendesk Tickets category ID

          // Step 1 — Search existing topic
          try {
            const res = await fetch(
              `/search/query.json?q=${encodeURIComponent(topicTitle)}&category=${internalCategoryId}`
            );
            const data = await res.json();
            const existing = data?.topics?.find((t) => t.title === topicTitle);
            if (existing) {
              console.log("Reusing existing internal topic:", existing.id);
              return existing.id;
            }
          } catch (e) {
            console.warn("Topic lookup failed:", e);
          }

          // Step 2 — Create new topic
          try {
            const res = await fetch("/posts.json", {
              method: "POST",
              headers: {
                "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
                "X-CSRF-Token": document
                  .querySelector("meta[name='csrf-token']")
                  ?.getAttribute("content"),
              },
              body: new URLSearchParams({
                title: topicTitle,
                raw: `Internal ticket container for chat channel **${channelName}** (ID ${channelId})`,
                archetype: "regular",
                category: internalCategoryId,
                visible: false,
              }),
            });
            const data = await res.json();
            if (data?.topic_id) {
              console.log("Created new internal topic:", data.topic_id);
              return data.topic_id;
            }
          } catch (e) {
            console.error("Failed to create internal topic:", e);
          }

          return null;
        }

        function getCurrentChatChannel() {
          try {
            const chatService = api.container.lookup("service:chat");
            if (chatService?.activeChannel) return chatService.activeChannel;
          } catch {}
          return null;
        }

        function addZendeskButton() {
          document.querySelectorAll(".chat-message-actions-container").forEach((container) => {
            if (container.querySelector(".create-zendesk-ticket")) return;

            const details = container.querySelector(".more-actions-chat");
            if (!details) return;
            const detailsBody = details.querySelector(".select-kit-body");
            if (!detailsBody) return;

            const btn = document.createElement("li");
            btn.className =
              "select-kit-row dropdown-select-box-row create-zendesk-ticket ember-view";
            btn.setAttribute("role", "menuitemradio");
            btn.setAttribute("tabindex", "0");
            btn.innerHTML = `
              <div class="icons">
                <span class="selection-indicator"></span>
                <svg class="fa d-icon d-icon-life-ring svg-icon" aria-hidden="true">
                  <use href="#life-ring"></use>
                </svg>
              </div>
              <div class="texts">
                <span class="name">Create Zendesk Ticket</span>
              </div>
            `;

            btn.addEventListener("click", async (e) => {
              e.preventDefault();
              e.stopPropagation();

              const messageId = container.dataset.id;
              const messageEl = document.querySelector(`[data-id='${messageId}']`);
              const messageText =
                messageEl?.querySelector(".chat-message-text")?.innerText?.trim() || "(no text)";
              const messageAuthor =
                messageEl?.querySelector(".username")?.innerText?.trim() || "Unknown";
              const chatUrl = `${window.location.origin}/chat/message/${messageId}`;

              const chatChannel = getCurrentChatChannel();
              if (!chatChannel?.id) {
                alert("Cannot create Zendesk ticket: missing chat channel context.");
                return;
              }

              const channelId = chatChannel.id;
              const channelName =
                chatChannel.title || chatChannel.name || `Channel #${channelId}`;
              const subject = `[Chat] ${channelName} — message from ${messageAuthor}`;
              const description = `Message by ${messageAuthor} in channel "${channelName}" (ID: ${channelId})\n\n${messageText}\n\nView message: ${chatUrl}`;

              console.log("Creating Zendesk ticket from chat:", {
                channelId,
                channelName,
                messageId,
                subject,
              });

              const topicId = await ensureTopicForChannel(channelId, channelName);
              if (!topicId) {
                alert("Failed to create or find topic for chat channel.");
                return;
              }

              try {
                const res = await fetch("/zendesk-plugin/issues.json", {
                  method: "POST",
                  headers: {
                    "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
                    "X-CSRF-Token": document
                      .querySelector("meta[name='csrf-token']")
                      ?.getAttribute("content"),
                    Accept: "application/json",
                  },
                  body: new URLSearchParams({
                    topic_id: topicId,
                    subject,
                    description,
                  }),
                });

                const text = await res.text();
                let data;
                try {
                  data = JSON.parse(text);
                } catch {
                  console.error("Zendesk returned non-JSON response:", text);
                  throw new Error(`Zendesk returned non-JSON (${res.status})`);
                }

                if (!res.ok) {
                  console.error("Zendesk error:", data);
                  throw new Error(`Zendesk API responded ${res.status}`);
                }

                console.log("Zendesk ticket created successfully:", data);
                api.showToast?.("Zendesk ticket created successfully.", {
                  title: "Success",
                  icon: "check",
                });

                if (data.zendesk_url) {
                  window.open(data.zendesk_url, "_blank");
                }
              } catch (err) {
                console.error("Zendesk ticket creation failed:", err);
                api.showToast?.("Failed to create Zendesk ticket.", {
                  title: "Error",
                  icon: "times",
                });
              }
            });

            detailsBody.appendChild(btn);
          });
        }

        const observer = new MutationObserver((mutations) => {
          for (const m of mutations) {
            m.addedNodes.forEach((node) => {
              if (!(node instanceof HTMLElement)) return;
              if (
                node.classList.contains("chat-message-actions-container") ||
                node.querySelector(".chat-message-actions-container")
              ) {
                addZendeskButton();
              }
            });
          }
        });

        observer.observe(document.body, { childList: true, subtree: true });
      } catch (e) {
        console.error("Zendesk chat initializer failed:", e);
      }
    });
  },
};

