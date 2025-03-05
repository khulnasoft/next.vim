package main

import (
	"context"
	"fmt"
	"time"

	"github.com/khulnasoft/next.vim/vim-mate/examples/v2/doom"
	"github.com/khulnasoft/next.vim/vim-mate/pkg/v2/assert"
	"github.com/khulnasoft/next.vim/vim-mate/pkg/v2/chat"
	"github.com/khulnasoft/next.vim/vim-mate/pkg/v2/controller"
)

type Send struct {
}

func (s *Send) SendKey(str string) {
	fmt.Printf("kkey received: %s\n", str)
}

func main() {
	ctx := context.Background()
	//doom create controller
	twitchChat, err := chat.NewTwitchChat(ctx, "khulnasoft")
	assert.NoError(err, "twitch cannot initialize")
	chtAgg := chat.
		NewChatAggregator().
		WithFilter(doom.DoomFilterFn).
		WithMap(doom.DoomChatMapFn)
	go chtAgg.Pipe(twitchChat)
	doomCtrl := doom.NewDoomController(&Send{})
	ctrl := controller.
		NewController(&chtAgg, doomCtrl).
		WithInputTimer(time.NewTicker(time.Millisecond * 75).C).
		WithPlayTimer(time.NewTicker(time.Millisecond * 16).C)
	ctrl.Start(ctx)
}
