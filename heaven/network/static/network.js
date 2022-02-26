//submit new post via main page
document.addEventListener('DOMContentLoaded', function(){
    const submit = document.querySelector('#submit_new');
    const textarea = document.querySelector('#textarea_new');
    const form = document.querySelector('#new_post');

    //making sure that text is not empty
    submit.disabled = true;
    stop_empty_posts(submit, textarea);

    form.addEventListener('submit', function() {submit_new(textarea)});
});

//basically if the textarea is empty, we can not post anything. there sould be text in textarea
function stop_empty_posts(submit, textarea) {
    textarea.onkeyup = () => {
        if (textarea.value.length > 0) {
            submit.disabled=false;
        } else {
            submit.disabled=true;
        }
    };
}

//post thoughts via New Heaven button
document.addEventListener('DOMContentLoaded', function(){
    document.querySelector('#new_heaven').onclick = function() {
        call_overlay();
        document.querySelector('#overlay_heading').innerHTML = 'New Post';
        const form = document.querySelector('#overlay_form');
        const textarea = document.querySelector('#overlay_text');
        form.addEventListener('submit', function() {submit_new(textarea)});
    };
});

// when we press the new heaven botton
function call_overlay() {
    //display=block makes notificationbox(overlay) visible
    document.querySelector('#overlay').style.display='block';
    //making that notificationbox(overlay) able to close by clicking the button
    document.querySelector('#close_button').addEventListener('click', function(){
        document.querySelector('#overlay').style.display='none';
    });

    const submit = document.querySelector('#overlay_button');
    const textarea = document.querySelector('#overlay_text');
    submit.disabled = true;
    stop_empty_posts(submit, textarea);
}


// creating post instance with textarea input
function submit_new(textarea) {
    //Send a POST request of new post
    fetch('/new', {
        method:'POST',
        body: JSON.stringify({
            content: textarea.value
        })
    })
    .then(response => response.json())
    .then(result => {
        if (result.message) {console.log(result.message);
        } 
    })
    location.reload()
    //Stop the form from submitting
    return false
};





//edit post
document.addEventListener('DOMContentLoaded', function(){
    // when edit post is clicked, then show overlay page with textbox
    document.querySelectorAll('.edit_btn').forEach(function(edit){
        edit.onclick= function(event) {
            const id = edit.dataset.post_id;
            const form = document.querySelector('#overlay_form');

            //Stop heavening to <div>
            event.stopPropagation();
            call_overlay();
            document.querySelector('#overlay_heading').innerHTML = 'Update';

            //Put text in the textarea
            document.querySelector('#overlay_text').innerHTML = document.querySelector(`#post_content${id}`).innerHTML;

            // submit the form when you click submit
            form.addEventListener('submit', function() {submit_edit(id)});
        };
    });
});

//edit function to  commit the edit post
function submit_edit(id) {
    //take the updated content in textarea
    const updated_content = document.querySelector('#overlay_text').value;
    //Send a put request to change the content
    fetch(`/post/${id}`, {
        method:'PUT',
        body: JSON.stringify({
            content: updated_content
        })
    })
    .then(response => response.json())
    .then(result => {
        if (result.message) { console.log(result.message);
        } 
    })

    //Replace the item in HTML first, no need to reload the page
    //close that overlay from the screen
    //stop the form from submitting
    document.querySelector(`#post_content${id}`).innerHTML = updated_content;
    document.querySelector('#overlay').style.display='none';
    return false
};





//reply on post
document.addEventListener('DOMContentLoaded', function(){
    document.querySelectorAll('.comment_icon').forEach(function(reply) {
        reply.onclick = function(event) {
            //the id of the post this reply was made to
            const replied_to_id = reply.dataset.post_id;
            const form = document.querySelector('#overlay_form');
            const textarea = document.querySelector('#overlay_text');

            //stop heavening to <div>
            event.stopPropagation();

            if (authenticated === 'True') {
                call_overlay();
                document.querySelector('#overlay_heading').innerHTML = 'Reply';

                //if you click submit the form:
                //create it as a new post instance, and then link it with the post it was replying to
                form.addEventListener('submit', function() {
                    link_reply(replied_to_id, textarea);
                });
            }
        };

    });
});

//reply only function, basically link reply to post
// used in upper function.
function link_reply(replied_to_id, textarea) {
    //create a new post request
    fetch('/new', {
        method:'POST',
        body: JSON.stringify({
            content: textarea.value
        })
    })
    .then(response => response.json())
    .then(result => {
        //when the new post created, link it to the post it was replying
        var replied_by_id = result.id_created;
        console.log(`post created id = ${replied_by_id}`)
        return fetch(`/post/${replied_to_id}`, {
            method:'PUT',
            body: JSON.stringify({
                reply: replied_by_id
            })
        })
    })
    .then(response => response.json())
    .then(result => {
        if (result.message) {
            console.log(result.message);
        } 
    })

    //refresh the page and increase the reply count
    //stop the form from submitting
    location.reload()
    document.querySelector(`#comment_count${replied_to_id}`).innerHTML ++;
    return false
}




//follow
document.addEventListener('DOMContentLoaded', function(){
    const follow_btn = document.querySelector('#follow_btn');
    const profile_username = document.querySelector('#real_prof_owner').innerHTML;

    follow_btn.addEventListener('click',function() {
        if (follow_btn.innerHTML === 'Follow') {
            //basically adding to the profile owner's follow count via sending a put request
            fetch(`/user/${curr_user}`, {
                method:'PUT',
                body: JSON.stringify({
                    follow: profile_username
                })
            })
            //after that we need to also change follow button to an unfollow button
            follow_btn.innerHTML = 'Unfollow';
            document.querySelector('#prof_follower').innerHTML ++;

        }
        else {
            //vice versa of first part, unfollow to follow
            fetch(`/user/${curr_user}`, {
                method:'PUT',
                body: JSON.stringify({
                    unfollow: profile_username
                })
            })
            //changing unfollow to a follow(button)
            follow_btn.innerHTML = 'Follow';
            document.querySelector('#prof_follower').innerHTML --;
        }
    });
});




//likes
document.addEventListener('DOMContentLoaded', function(){
    //look at all like buttons
    document.querySelectorAll('.like_icon').forEach(function(button){
        if (button.dataset.liked === 'true') {
        }
        //if any of the buttons are clicked, just execute the like_post function for that post
        button.onclick = function(event) {
            if (authenticated === 'True') {
                like_post(button)
            }
            //Stop heavening to <div>
            event.stopPropagation();
        };
    });
});

//like function, committing likes/unlikes
function like_post(button) {
    const id = button.dataset.post_id;
    //if post was not liked before
    if (button.dataset.liked === 'false') {
        //just send put request to add a like to the post
        fetch(`/post/${id}`, {
            method:'PUT',
            body: JSON.stringify({
                like: true
            })
        })
        //increase the like count then change the data
        document.querySelector(`#like_count${id}`).innerHTML ++;
        button.dataset.liked = 'true';
    }

    else {
        //vice versa of the first part
        fetch(`/post/${button.dataset.post_id}`, {
            method:'PUT',
            body: JSON.stringify({
                like: false
            })
        })
        document.querySelector(`#like_count${id}`).innerHTML --;
        button.dataset.liked = 'false';
    }
}




//click on post
document.addEventListener('DOMContentLoaded', function(){
    document.querySelectorAll('.post').forEach(function(post){
        post.onclick = function() {
            const post_id = post.dataset.post_id;
            window.location.href = `/post/${post_id}`;
        };
    });
});





