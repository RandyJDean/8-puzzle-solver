import heapq

def heuristic(state, goal): 
    distance = 0 
    GOAL = {}
    for i in range (3): 
        for j in range (3): # these two lines are used to loop through the rows and colums to see 
            GOAL[goal[i][j]] = (i,j)

    for i in range (3): 
        for j in range (3): 
            value = state[i][j] 
            if value != 0: 
                goal_i, goal_j = GOAL[value] #where does the tile need to go to be right 
                distance += abs(i - goal_i) + abs(j - goal_j) # the number of rows and colums off 
    return distance

def GOAL_STATE(): 
    return [[1,2,3],[4,5,6],[7,8,0]]


def moves(state): 
    x , y = 0, 0
    for i in range(3):
        for j in range(3): 
            if state[i][j] == 0: 
                x, y = i, j 

    res = []
    directions = [(-1, 0), (1, 0), (0, -1), (0, 1)] # how it can move yall 
    for direction in directions: #tries all the direction 
        i = x + direction[0] # i represents x since I can not use the same vairable x 
        j = y + direction[1] # j represents y becuase of the same reason --- just wanted to clarify what it ment yall
        if 0 <= j < 3 and 0 <= i < 3:
            new_state = [row[:] for row in state]
            new_state[x][y], new_state[i][j] = new_state[i][j], new_state[x][y] # action of swapping the blanks with the tile
            res.append(new_state)
    return res

def A_Star (start, goal = None): 
    if goal is None: 
        goal = GOAL_STATE()

    queue = []
    heapq.heappush(queue, (heuristic(start, goal), start, [])) #add the starting board to the queue along with its parts
    already_visited = set()

    while queue: 
        f, current, path = heapq.heappop(queue) # asssign the partts of the queue to differnt variable (unpacking) f = g + h (heuristic), current = start. and path = []
        key = tuple(tuple(row) for row in current)

        if key in already_visited: 
            continue
        already_visited.add(key) #marks the board as explored

        if current == goal: 
            return path + [current] #returns the baord and the full list of baords 

        for move in moves(current): 
            move_kay = tuple(tuple(row) for row in move)  
            if move_kay not in already_visited: #moves if the board is not visited
                new_path = path + [current] # dont loose the baord we were just on 
                g = len(new_path)
                h = heuristic(move, goal) #distance remaining
                heapq.heappush(queue, (g + h, move, new_path)) # adds board to queue

    return None  

if __name__ == "__main__":
    start = []
    for i in range(3): 
        row = list(map(int, input(f"Enter row {i + 1} (numbers separated by spaces): ").split())) # type in the rows
        start.append(row) 

    answer = A_Star(start)

    if answer:
        print(f"solved in {len(answer) - 1 } moves")
        for step in answer: 
            for row in step: 
                print(row) #Loop is used going through each board and row then print it 
            print()
    else: 
        print("The problem given can not be solces")