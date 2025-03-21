package sim

import (
	"context"
	"encoding/binary"
	"log/slog"
	"math/rand"
	"sync"

	"github.com/khulnasoft/next.vim/arcadevim/pkg/api"
	"github.com/khulnasoft/next.vim/arcadevim/pkg/assert"
)

var clientId uint64 = 0
func getNextId() [16]byte {
    id := [16]byte{}
    binary.BigEndian.PutUint64(id[:], clientId)
    clientId++

    return id
}

type SimulationConnections struct {
	clients []*api.Client
	adds    []*api.Client
	removes []*api.Client
	factory TestingClientFactory
	m       sync.Mutex
	rand    *rand.Rand
	logger  *slog.Logger
	wait    sync.WaitGroup
}

func NewSimulationConnections(f TestingClientFactory, r *rand.Rand) SimulationConnections {
	return SimulationConnections{
		m:       sync.Mutex{},
		clients: []*api.Client{},
		adds:    []*api.Client{},
		removes: []*api.Client{},
		factory: f,
		rand:    r,
		logger:  slog.Default().With("area", "SimulationConnections"),
	}
}

func (s *SimulationConnections) Len() int {
	s.m.Lock()
	defer s.m.Unlock()
	return len(s.clients)
}

func (s *SimulationConnections) StartRound(adds int, removes int) {
	s.wait = sync.WaitGroup{}

	s.wait.Add(adds)
	s.wait.Add(removes)
}

func (s *SimulationConnections) AssertAddsAndRemoves() {
	for _, c := range s.adds {
		assert.Assert(c.State == api.CSConnected, "state of connection is not connected", "state", api.ClientStateToString(c.State))
	}

	for _, c := range s.removes {
		assert.Assert(c.State == api.CSDisconnected, "state of connection is not disconnected", "state", api.ClientStateToString(c.State))
	}

}

func (s *SimulationConnections) FinishRound() ([]*api.Client, []*api.Client) {
	s.wait.Wait()

	removes := s.removes
	adds := s.adds

	s.removes = []*api.Client{}
	s.adds = []*api.Client{}

	return adds, removes
}

func (s *SimulationConnections) AddBatch(count int) int {
	clients := s.factory.CreateBatchedConnectionsWithWait(count, &s.wait)

	s.m.Lock()
	defer s.m.Unlock()

	idx := len(s.clients)
	s.clients = append(s.clients, clients...)
	s.adds = append(s.adds, clients...)
	return idx
}

func (s *SimulationConnections) Add() int {
	client := s.factory.NewWait(&s.wait)

	s.m.Lock()
	defer s.m.Unlock()

	idx := len(s.clients)
	s.clients = append(s.clients, client)
	s.adds = append(s.adds, client)
	s.logger.Info("Add", "len", len(s.adds))
	return idx
}

func (s *SimulationConnections) Remove(count int) {
	removal := func(count int) []*api.Client {
		out := make([]*api.Client, 0, count)
		s.m.Lock()
		defer s.m.Unlock()

        length := len(s.clients) - len(s.adds)
		for range count {
			idx := s.rand.Int() % length
			out = append(out, s.clients[idx])
			s.clients = append(s.clients[0:idx], s.clients[idx+1:]...)
            length--
		}

		return out
	}

	removes := removal(count)
	s.removes = append(s.removes, removes...)

	assert.Assert(len(removes) == count, "we did not remove enough connections", "removes", len(removes), "count", count)
	for _, c := range removes {
		c.Disconnect()
		s.wait.Done()
		s.logger.Warn("Disconnect Client", "addr", c.Addr())
	}
}

type TestingClientFactory struct {
	host   string
	port   uint16
	logger *slog.Logger
}

func NewTestingClientFactory(host string, port uint16, logger *slog.Logger) TestingClientFactory {
	return TestingClientFactory{
		logger: logger.With("area", "TestClientFactory"),
		host:   host,
		port:   port,
	}
}

func (f *TestingClientFactory) CreateBatchedConnectionsWithWait(count int, wait *sync.WaitGroup) []*api.Client {
	conns := make([]*api.Client, 0)

	f.logger.Info("creating all clients", "count", count)
	for range count {
		conns = append(conns, f.NewWait(wait))
	}
	f.logger.Info("clients all created", "count", count)

	return conns
}

func (f *TestingClientFactory) CreateBatchedConnections(count int) []*api.Client {
	wait := &sync.WaitGroup{}
	clients := f.CreateBatchedConnectionsWithWait(count, wait)

	f.logger.Info("CreateBatchedConnections waiting", "count", count)
	wait.Wait()

	return clients
}

func (f TestingClientFactory) WithPort(port uint16) TestingClientFactory {
	f.port = port
	return f
}

func (f *TestingClientFactory) New() *api.Client {
	client := api.NewClient(f.host, f.port, getNextId())
	f.logger.Info("factory connecting", "id", client.Id())
	client.Connect(context.Background())
    client.WaitForReady()
	f.logger.Info("factory connected", "id", client.Id())
	return &client
}

// this is getting hacky...
func (f *TestingClientFactory) NewWait(wait *sync.WaitGroup) *api.Client {
	client := api.NewClient(f.host, f.port, [16]byte(getNextId()))

    id := client.Id()
	f.logger.Info("factory new client with wait", "id", id)

	go func() {
		defer func() {
			f.logger.Info("factory client connected with wait", "id", id)
			wait.Done()
		}()

		f.logger.Info("factory client connecting with wait", "id", id)
        err := client.Connect(context.Background())
        assert.NoError(err, "unable to connect to mm", "id", id)
		client.WaitForReady()
	}()

	return &client
}
