package api

import (
	"context"
	"fmt"
	"log/slog"
	"net"
	"os"
	"sync"
	"time"

	"github.com/khulnasoft/next.vim/arcadevim/pkg/assert"
	gameserverstats "github.com/khulnasoft/next.vim/arcadevim/pkg/game-server-stats"
	"github.com/khulnasoft/next.vim/arcadevim/pkg/packet"
)

var id = 0

func getId() int {
	out := id
	id++
	return out
}

type GameServerRunner struct {
	done     bool
	doneChan     chan struct{}
	db       gameserverstats.GSSRetriever
	stats    gameserverstats.GameServerConfig
	listener net.Listener
	logger   *slog.Logger
	mutex    sync.Mutex
}

func NewGameServerRunner(db gameserverstats.GSSRetriever, stats gameserverstats.GameServerConfig) *GameServerRunner {
	logger := slog.Default().With("area", "GameServer")
	logger.Warn("new dummy game server", "ID", os.Getenv("ID"))

	return &GameServerRunner{
		logger: logger,
		stats:  stats,
		db:     db,
        done: false,
		doneChan:   make(chan struct{}, 1),
		mutex:  sync.Mutex{},
	}
}

func (g *GameServerRunner) innerListenForConnections(listener net.Listener) <-chan net.Conn {
	ch := make(chan net.Conn, 10)
	go func() {
		for {
			c, err := listener.Accept()
            if g.done {
                break
            }

			assert.NoError(err, "GameServerRunner was unable to accept connection")
			ch <- c
		}
	}()
	return ch
}

// this function is so bad that i need to see a doctor
// which also means i am ready to work at FAANG
func (g *GameServerRunner) incConnections(amount int) {
	g.mutex.Lock()
	defer g.mutex.Unlock()

	g.stats.Connections += amount
	g.stats.Load += float32(amount) * 0.001

	if amount >= 0 {
		g.stats.ConnectionsAdded += amount
        g.logger.Info("incConnections(added)", "stats", g.stats.String())
	} else {
		g.stats.ConnectionsRemoved -= amount
        g.logger.Info("incConnections(removed)", "stats", g.stats.String())
	}

}

func (g *GameServerRunner) handleConnection(ctx context.Context, conn net.Conn, id int) {
	g.incConnections(1)
    defer g.incConnections(-1)

    framer := packet.NewPacketFramer()
    go packet.FrameWithReader(&framer, conn)

    for {
        select {
        case <-ctx.Done():
            return
        case pkt := <-framer.C:
            g.logger.Info("packet received", "packet", pkt.String())
            if packet.IsCloseConnection(pkt) {
                g.logger.Info("client sent close command")
                return
            }
        }
    }

}

func (g *GameServerRunner) Run(outerCtx context.Context) error {
    ctx, cancel := context.WithCancel(outerCtx)

	g.logger.Warn("dummy-server#Run started...")
	portStr := fmt.Sprintf(":%d", g.stats.Port)
	listener, err := net.Listen("tcp4", portStr)
    assert.NoError(err, "unable to start server")

	defer func() {
        g.done = true
        listener.Close()
		g.doneChan <- struct{}{}
	}()

    go g.handleStatUpdating(ctx)

	g.stats.State = gameserverstats.GSStateReady
	err = g.db.Update(g.stats)
	assert.NoError(err, "unable to save the stats of the dummy game server on connection")

	g.logger.Warn("dummy-server#Run running...")

	if err != nil {
        cancel()
		return err
	}

	ch := g.innerListenForConnections(listener)

    // TODO do we even need this now that we have ids being transfered up
    // via client auth packet??
    connId := 0

outer:
	for {

		// TODO This should be configurable?
		timer := time.NewTimer(time.Second * 30)

		g.logger.Info("waiting for connection or ctx done")
		select {
		case <-timer.C:
			if g.stats.Connections == 0 {
                if g.stats.State == gameserverstats.GSStateReady {
                    g.idle()
                    break
                } else if g.stats.State == gameserverstats.GSStateIdle {
                    g.closeDown()
                    cancel()
                    break
                }
                assert.Never("i should never get to this position", "stats", g.stats)
            }
		case <-ctx.Done():
			break outer
		case c := <-ch:
            assert.Assert(g.stats.State != gameserverstats.GSStateClosed, "somehow got a connection when state became closed", "stats", g.stats)

			g.logger.Info("new dummy-server connection", "host", g.stats.Host, "port", g.stats.Port)
			go g.handleConnection(ctx, c, connId)
            connId++
            g.ready()
		}

        timer.Stop()
	}

	g.stats.State = gameserverstats.GSStateClosed
	err = g.db.Update(g.stats)
	assert.NoError(err, "unable to save the stats of the dummy game server on close")

    // lint requires me to do this despite it not being correct...
    cancel()
	return nil
}

func (g *GameServerRunner) handleStatUpdating(ctx context.Context) {
    timer := time.NewTicker(time.Millisecond * 200)
    prev := g.stats

    outer:
    for {
        select {
        case <-ctx.Done():
            break outer
        case <-timer.C:
            next := g.stats
            if !next.Equal(&prev) {
                err := g.db.Update(next)
                assert.NoError(err, "failed to update stats", "stats", next)
                prev = next
            }
        }
    }

}

func (g *GameServerRunner) closeDown() {
	g.mutex.Lock()
	defer g.mutex.Unlock()

    g.stats.State = gameserverstats.GSStateClosed
    g.db.Update(g.stats)
    g.logger.Info("setting state to closed", "stats", g.stats)
}

func (g *GameServerRunner) ready() {
    if g.stats.State == gameserverstats.GSStateReady {
        return
    }

	g.mutex.Lock()
	defer g.mutex.Unlock()

    g.stats.State = gameserverstats.GSStateIdle
    g.db.Update(g.stats)
    g.logger.Info("setting state to ready", "stats", g.stats)
}

func (g *GameServerRunner) idle() {
	g.mutex.Lock()
	defer g.mutex.Unlock()

    g.stats.State = gameserverstats.GSStateIdle
    g.db.Update(g.stats)
    g.logger.Info("setting state to idle", "stats", g.stats)
}

func (g *GameServerRunner) Close() {
	if g.listener != nil {
        g.done = true
		g.listener.Close()
	}
}

func (g *GameServerRunner) Wait() {
	<-g.doneChan
}

func (g *GameServerRunner) Loop() error {
	return nil
}
