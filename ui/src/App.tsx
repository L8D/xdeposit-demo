import * as React from 'react'
import Box from '@mui/system/Box'
import Container from '@mui/system/Container'
import CachedIcon from '@mui/icons-material/Cached'
import PlayArrowIcon from '@mui/icons-material/PlayArrow'
import { WorkflowView } from '@component/VisualizerLayout/WorkflowView'
import { useState } from 'react'
import { INITIAL_WORKFLOW_TEXT, SnipitSelector } from 'SnipitSelector'
import { createWorkflowFromString } from 'workflowStepParser'
import './magic-box.css'
import { ThemeProvider, createTheme } from '@mui/material/styles'
import CssBaseline from '@mui/material/CssBaseline'
import { Workflow } from '@fmp/sdk'
import Editor from 'react-simple-code-editor'
import highlight from './highlight'
import './material-dark.css'
import './solarized-dark-atom.css'
import './fonts.css'
import './magic-box.css'
import Button from '@mui/material/Button'
import { StepInfo } from '@component/StepView/StepInfo'
import Popup from 'Popup'
import { WorkflowProvider } from './components/WorkflowProvider'
import WorkflowPresetSelector from './components/WorkflowPresetSelector'
import ThemeSelector from './components/ThemeSelector'

const darkTheme = createTheme({
  palette: {
    mode: 'dark',
    primary: { main: 'rgb(66, 89, 96)' },
    background: {
      default: 'transparent',
    },
  },
})

function createWorkflow() {
  return createWorkflowFromString(INITIAL_WORKFLOW_TEXT)
}

function App(): JSX.Element {
  const [workflowText, setWorkflowText] = useState<string>(INITIAL_WORKFLOW_TEXT)
  const [workflow, setWorkflow] = useState<Workflow>(createWorkflow())
  const [workflowRunning, setWorkflowRunning] = useState(false)

  console.log('app', workflowText)

  const onUpdateWorkflow = () => {
    const newWorkflow = createWorkflowFromString(workflowText)
    setWorkflow(newWorkflow)
  }

  const onSniptChanged = (workflowText: string) => {
    console.log('onSnipitChanged', workflowText)
    const newWorkflow = createWorkflowFromString(workflowText)
    console.log('newWorkflow', newWorkflow)
    setWorkflowText(workflowText)
    setWorkflow(newWorkflow)
  }

  return (
    <WorkflowProvider onWorkflowTextChange={onSniptChanged}>
      <ThemeProvider theme={darkTheme}>
        <div className="max-w-4xl mx-auto">
          <div className="relative min-h-screen flex flex-col items-center space-y-5 py-5">
            <Box className="max-w-4xl mx-auto bg-s-base2 dark:bg-s-base02 poppy:bg-zinc-800 rounded-xl w-full p-5 space-y-5">
              <WorkflowPresetSelector />
              <Editor
                value={workflowText}
                highlight={highlight}
                onValueChange={setWorkflowText}
                preClassName="language-js"
                padding="1em"
                className="grow font-mono caret-sky-50 text-sm basis-0 rounded-xl w-full"
              />
            </Box>
            {/* buttons */}
            <Box sx={{ display: 'flex', zIndex: 1 }}>
              <Box m={1}>
                <Button variant="contained" onClick={() => onUpdateWorkflow()} disabled={workflowRunning} startIcon={<CachedIcon />}>
                  Compile
                </Button>
              </Box>
              <Box m={1}>
                <Button
                  variant="contained"
                  onClick={() => setWorkflowRunning(true)}
                  disabled={workflowRunning}
                  startIcon={<PlayArrowIcon />}
                >
                  Run
                </Button>
              </Box>
            </Box>
            <WorkflowView workflow={workflow} run={workflowRunning} onWorkflowCompleted={() => setWorkflowRunning(false)} />
            {/* <StepInfo step={workflow.steps[0]} active={true} /> */}
          </div>
        </div>
      </ThemeProvider>
    </WorkflowProvider>
  )
}

export default App
