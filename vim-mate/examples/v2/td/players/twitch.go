package players

import (
	"context"
	"log/slog"
	"strings"
	"time"

	"github.com/khulnasoft/next.vim/vim-mate/examples/v2/td"
	"github.com/khulnasoft/next.vim/vim-mate/examples/v2/td/objects"
	"github.com/khulnasoft/next.vim/vim-mate/pkg/v2/assert"
	"github.com/khulnasoft/next.vim/vim-mate/pkg/v2/chat"
)

func occurrencesToPositions(occ []chat.Occurrence, count int) []objects.Position {
	out := []objects.Position{}
	for i := range count {
		if len(occ) <= i {
			break
		}
		pos, err := objects.PositionFromString(occ[i].Msg)
		if err != nil {
			continue
		}
		out = append(out, pos)
	}

	slog.Warn("occurrencesToPositions", "out", out)
	return out
}

func tdFilter(rows, cols uint) func(msg string) bool {
	return func(msg string) bool {
		c, err := objects.PositionFromString(msg)
		if err != nil {
			return false
		}

		return c.Row <= rows && c.Row >= 1 &&
			c.Col <= cols && c.Col >= 1
	}
}

type TwitchTDChat struct {
	chtAgg chat.ChatAggregator
	chat   string
	team   uint8
}

func NewTwitchTDChat(c string, team uint8) TwitchTDChat {
	chtAgg := chat.
		NewChatAggregator().
		WithFilter(tdFilter(24, 80))

	return TwitchTDChat{
		chtAgg: chtAgg,
		chat:   c,
		team:   team,
	}
}

func (t *TwitchTDChat) Run(ctx context.Context) {
	twitchChat, err := chat.NewTwitchChat(ctx, t.chat)
	assert.NoError(err, "twitch cannot initialize")

	go t.chtAgg.Pipe(twitchChat)
}

func (t *TwitchTDChat) Moves(gs *objects.GameState, ctx context.Context) []objects.Position {
	occs := t.chtAgg.Peak()
	return occurrencesToPositions(occs, gs.AllowedTowers)
}

func (r *TwitchTDChat) Name() string {
	return "twitch-" + r.chat
}

func (r *TwitchTDChat) runStreamResults(gs *objects.GameState, out PositionChan, _ Done, ctx context.Context) {
outer:
	for {
		time.Sleep(time.Second)
		select {
		case <-ctx.Done():
			break outer
		default:
			moves := r.Moves(gs, ctx)
			slog.Warn("runStreamResults", "moves", moves)
			out <- moves
		}
	}
}

func (r *TwitchTDChat) StreamResults(team uint8, gs *objects.GameState, out PositionChan, done Done, ctx context.Context) {
	go r.runStreamResults(gs, out, done, ctx)
}

func (t *TwitchTDChat) EndRound(gs *objects.GameState, cmdr td.TDCommander) {}

func (t *TwitchTDChat) StartRound() {
	t.chtAgg.Reset()
}

func (r *TwitchTDChat) Stats() objects.Stats {
	return objects.Stats{}
}

func TwitchPlayerFromString(arg string, team uint8) TwitchTDChat {
	assert.Assert(strings.HasPrefix(arg, "twitch"), "invalid player string for twitch client", "arg", arg)

	parts := strings.Split(arg, ":")
	assert.Assert(len(parts) == 2, "invalid player string colon count", "parts", parts)

	return NewTwitchTDChat(parts[1], team)
}
