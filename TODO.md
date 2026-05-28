# TODO — CRITICAL FRONTEND FIXES (Live Chat + AI UX)

## Live Chat
- [ ] Inspect existing chat usage on user side (LiveChat component)
- [ ] Add admin live chat panel (active customer chats + realtime messages + unread indicators)
- [ ] Implement shared session/conversation ID logic for user/admin
- [ ] Fix websocket chat routing so incoming messages go to correct session/thread
- [ ] Upgrade user chat UX (timestamps, separation styling, support labels)
- [ ] Wire admin chat entry into dashboard/admin navigation

## AI Assistant UX
- [ ] Improve fallback behavior when retrieval finds no matching products (related products + alternative categories)
- [ ] Improve follow-up query continuity (“dell”, “15”) via better context carryover
- [ ] Improve search intent UX labels and suggestion mapping

## Verification
- [ ] Manual realtime test: user sends → admin receives; admin replies → user receives
- [ ] Manual multi-session test: switch between multiple customers/admin view
- [ ] Manual AI test: non-existent item shows alternatives; follow-up continuity works

