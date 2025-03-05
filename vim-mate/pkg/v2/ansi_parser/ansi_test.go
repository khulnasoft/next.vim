package ansiparser_test

import (
	"os"
	"testing"
	"time"

	ansiparser "github.com/khulnasoft/next.vim/vim-mate/pkg/v2/ansi_parser"
	"github.com/stretchr/testify/require"
)

func TestAnsi(t *testing.T) {
	data, err := os.ReadFile("./doom_frame_start")
	require.NoError(t, err)

	parser := ansiparser.NewFramer().WithDim(2, 160)
	parser.Write(data)

	timer := time.NewTimer(time.Millisecond * 10)
	select {
	case <-timer.C:
		require.Fail(t, "failed to get frame after 10 ms")
	case f := <-parser.Frames():
		require.Equal(t, 2*160, len(f.Color))
	}

}

func TestAsciiPixelTest(t *testing.T) {
	data := []byte("llllll;;llllllllllllllllIIllll>>llllllllll::llllll;;;;IIII;;")
	data = ansiparser.RemoveAsciiStyledPixels(data)

	require.Equal(t,
		[]byte("lll;llllllllIll>lllll:lll;;II;"),
		data)
}
