using {taskruns} from '../db/schema';

service TaskService {
    entity TaskRuns as projection on taskruns.TaskRuns;
}
